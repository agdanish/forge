/**
 * Exploratory Validation Harness
 *
 * Renders each shell into a real Vite+React project, opens in headless Chromium,
 * and validates against shell capability contracts.
 *
 * No LLM calls. No API calls. No credits consumed.
 * Run: npx tsx scripts/exploratory-validation.ts
 */

import { chromium, type Browser, type Page } from 'playwright';
import { renderFromSpec } from '../src/shells/renderer.js';
import { ALL_FIXTURES } from './fixtures/shell-fixtures.js';
import { SHELL_CONTRACTS, type ShellContract, type InteractiveCheck } from './shell-contracts.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn, type ChildProcess } from 'child_process';

// ══════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════

interface ShellValidationResult {
  shell: string;
  passed: boolean;
  renderTime: number;
  checks: CheckResult[];
  consoleErrors: string[];
  screenshotPath: string | null;
}

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
}

interface ValidationReport {
  timestamp: string;
  totalShells: number;
  passedShells: number;
  failedShells: number;
  results: ShellValidationResult[];
}

// ══════════════════════════════════════════════════
// TEMP PROJECT SETUP
// ══════════════════════════════════════════════════

const TEMP_BASE = path.join(process.cwd(), '.exploratory-tmp', `run-${Date.now()}`);
const REPORTS_DIR = path.join(process.cwd(), 'reports', 'exploratory');

function ensureDirs() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function writeShellProject(shell: string, files: { path: string; content: string }[]): string {
  const projectDir = path.join(TEMP_BASE, shell);

  // Clean previous (handle Windows junction locks gracefully)
  if (fs.existsSync(projectDir)) {
    try {
      // Remove junction first if it exists (Windows)
      const nmPath = path.join(projectDir, 'node_modules');
      if (fs.existsSync(nmPath)) {
        try {
          fs.unlinkSync(nmPath); // Works for junctions
        } catch {
          try { fs.rmSync(nmPath, { recursive: true, force: true }); } catch {}
        }
      }
      fs.rmSync(projectDir, { recursive: true, force: true });
    } catch {
      // If still locked, just overwrite files in place
    }
  }

  // Write all files
  for (const file of files) {
    const filePath = path.join(projectDir, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }

  return projectDir;
}

function installDeps(projectDir: string): boolean {
  try {
    execSync('npm install --prefer-offline --no-audit --no-fund', {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: 120000,
    });
    return true;
  } catch (err) {
    console.error(`  ❌ npm install failed in ${projectDir}`);
    return false;
  }
}

async function startViteServer(projectDir: string): Promise<{ process: ChildProcess; url: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['vite', '--port', '0', '--host', '127.0.0.1'], {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Vite server did not start within 30s'));
    }, 30000);

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
      // Vite prints: Local: http://localhost:XXXX/ (with ANSI color codes)
      // Strip ANSI codes before matching
      const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
      const match = clean.match(/Local:\s+(https?:\/\/[\d.]+:\d+)\/?/);
      if (match) {
        clearTimeout(timeout);
        resolve({ process: child, url: match[1] });
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ══════════════════════════════════════════════════
// VALIDATION CHECKS
// ══════════════════════════════════════════════════

async function checkRequiredSelectors(page: Page, contract: ShellContract): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const selector of contract.requiredSelectors) {
    try {
      const count = await page.locator(selector).count();
      results.push({
        name: `Selector: ${selector}`,
        passed: count > 0,
        details: count > 0 ? `Found ${count} element(s)` : 'NOT FOUND',
      });
    } catch {
      results.push({
        name: `Selector: ${selector}`,
        passed: false,
        details: 'Selector evaluation error',
      });
    }
  }

  return results;
}

async function checkRequiredText(page: Page, contract: ShellContract): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const bodyText = await page.textContent('body') || '';

  for (const text of contract.requiredText) {
    const found = bodyText.includes(text);
    results.push({
      name: `Text: "${text}"`,
      passed: found,
      details: found ? 'Found in page body' : 'NOT FOUND in page body',
    });
  }

  return results;
}

async function checkAboveFold(page: Page, contract: ShellContract): Promise<CheckResult> {
  const viewport = page.viewportSize() || { width: 1280, height: 800 };

  // Count visible elements above the fold
  const count = await page.evaluate((foldHeight: number) => {
    const elements = document.querySelectorAll('button, input, h1, h2, h3, [class*="card"], [class*="kpi"], [class*="stat"], table, nav, [class*="hero"]');
    let aboveFold = 0;
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < foldHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
        aboveFold++;
      }
    });
    return aboveFold;
  }, viewport.height);

  return {
    name: 'Above-the-fold content',
    passed: count >= contract.minAboveFoldElements,
    details: `${count} elements above fold (min: ${contract.minAboveFoldElements})`,
  };
}

async function checkInteractive(page: Page, check: InteractiveCheck): Promise<CheckResult> {
  try {
    // Try to find the element using various selector strategies
    let element = page.locator(check.selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      // Fallback: try simpler selectors
      if (check.selector.includes(':has-text')) {
        // Extract text and try a simpler approach
        const textMatch = check.selector.match(/:has-text\("(.+?)"\)/);
        if (textMatch) {
          element = page.getByText(textMatch[1], { exact: false }).first();
        }
      }

      const fallbackExists = await element.count() > 0;
      if (!fallbackExists) {
        return {
          name: `Interactive: ${check.description}`,
          passed: check.optional === true,
          details: check.optional ? 'Element not found (optional, skipped)' : 'Element not found',
        };
      }
    }

    // Capture DOM state before interaction
    const beforeHTML = await page.content();

    try {
      if (check.typeText) {
        // Type text into input
        await element.fill(check.typeText, { timeout: 3000 });
        await page.waitForTimeout(500);
      } else {
        await element.click({ timeout: 3000 });
        await page.waitForTimeout(500); // Wait for React state update
      }
    } catch {
      return {
        name: `Interactive: ${check.description}`,
        passed: check.optional === true,
        details: check.optional ? 'Interaction failed (optional, skipped)' : 'Interaction failed - element not interactable',
      };
    }

    // Check if DOM changed
    const afterHTML = await page.content();
    const changed = beforeHTML !== afterHTML;

    return {
      name: `Interactive: ${check.description}`,
      passed: changed,
      details: changed ? 'DOM changed after interaction ✓' : 'No DOM change detected (dead interaction)',
    };
  } catch (err) {
    return {
      name: `Interactive: ${check.description}`,
      passed: check.optional === true,
      details: `Error: ${(err as Error).message}`,
    };
  }
}

async function checkDeadInteractions(page: Page): Promise<CheckResult> {
  // Find ALL buttons and clickable elements, check if they cause DOM changes
  const deadCount = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    let dead = 0;
    let total = 0;

    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      // Only check visible buttons
      if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight) {
        total++;
        // Check if button has click handler (basic check)
        const hasOnClick = btn.onclick !== null;
        const hasReactHandler = Object.keys(btn).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactEvents'));
        if (!hasOnClick && !hasReactHandler) {
          // Check if it's inside a form or has type="submit"
          const isFormButton = btn.type === 'submit' || btn.closest('form');
          if (!isFormButton) {
            dead++;
          }
        }
      }
    });

    return { dead, total };
  });

  return {
    name: 'Dead interaction scan',
    passed: true, // Informational — React event handlers may not be detectable this way
    details: `Scanned ${deadCount.total} visible buttons, ${deadCount.dead} without detected handlers (React handlers may be internal)`,
  };
}

async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  return errors;
}

// ══════════════════════════════════════════════════
// MAIN VALIDATION LOOP
// ══════════════════════════════════════════════════

async function validateShell(
  browser: Browser,
  shellName: string,
  url: string,
): Promise<ShellValidationResult> {
  const contract = SHELL_CONTRACTS[shellName];
  const checks: CheckResult[] = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Set up console error collection BEFORE navigation
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const startTime = Date.now();

  try {
    // Navigate and wait for content
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Extra time for React hydration + Tailwind

    const renderTime = Date.now() - startTime;

    // Run all checks
    const selectorChecks = await checkRequiredSelectors(page, contract);
    checks.push(...selectorChecks);

    const textChecks = await checkRequiredText(page, contract);
    checks.push(...textChecks);

    const foldCheck = await checkAboveFold(page, contract);
    checks.push(foldCheck);

    for (const ic of contract.interactiveChecks) {
      const icResult = await checkInteractive(page, ic);
      checks.push(icResult);
    }

    const deadCheck = await checkDeadInteractions(page);
    checks.push(deadCheck);

    // Check for console errors (filter out harmless ones)
    const realErrors = consoleErrors.filter(e =>
      !e.includes('favicon.ico') &&
      !e.includes('DevTools') &&
      !e.includes('React DevTools')
    );

    checks.push({
      name: 'Console errors',
      passed: realErrors.length === 0,
      details: realErrors.length === 0 ? 'No console errors' : `${realErrors.length} error(s): ${realErrors[0]}`,
    });

    // Screenshot
    let screenshotPath: string | null = null;
    try {
      screenshotPath = path.join(REPORTS_DIR, `${shellName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch {
      screenshotPath = null;
    }

    const allPassed = checks.every(c => c.passed);

    return {
      shell: shellName,
      passed: allPassed,
      renderTime,
      checks,
      consoleErrors: realErrors,
      screenshotPath,
    };
  } catch (err) {
    checks.push({
      name: 'Page load',
      passed: false,
      details: `Failed to load: ${(err as Error).message}`,
    });

    return {
      shell: shellName,
      passed: false,
      renderTime: Date.now() - startTime,
      checks,
      consoleErrors,
      screenshotPath: null,
    };
  } finally {
    await page.close();
  }
}

// ══════════════════════════════════════════════════
// RUN
// ══════════════════════════════════════════════════

async function main() {
  console.log('FORGE — Exploratory Shell Validation');
  console.log('═'.repeat(90));
  console.log('Rendering all 5 shells → Vite → Playwright → Contract validation\n');

  ensureDirs();

  const shells = Object.keys(ALL_FIXTURES);
  const results: ShellValidationResult[] = [];
  const viteProcesses: ChildProcess[] = [];

  let browser: Browser | null = null;

  try {
    // Phase 1: Render all shells and write projects
    console.log('Phase 1: Rendering shells to Vite projects...');
    const shellProjects: { shell: string; dir: string }[] = [];

    for (const shell of shells) {
      const fixture = ALL_FIXTURES[shell];
      const rendered = renderFromSpec(fixture);
      const projectDir = writeShellProject(shell, rendered.files);
      shellProjects.push({ shell, dir: projectDir });
      console.log(`  ✅ ${shell} → ${rendered.files.length} files written`);
    }

    // Phase 2: Install deps (shared node_modules via symlink for speed)
    console.log('\nPhase 2: Installing dependencies...');

    // Install in the first project, then symlink node_modules to others
    const firstDir = shellProjects[0].dir;
    if (!installDeps(firstDir)) {
      throw new Error('Failed to install dependencies');
    }
    console.log(`  ✅ Dependencies installed in ${shellProjects[0].shell}`);

    const nodeModulesSource = path.join(firstDir, 'node_modules');
    for (let i = 1; i < shellProjects.length; i++) {
      const targetNM = path.join(shellProjects[i].dir, 'node_modules');
      try {
        // On Windows, use junction instead of symlink (no admin needed)
        if (process.platform === 'win32') {
          execSync(`mklink /J "${targetNM}" "${nodeModulesSource}"`, { stdio: 'pipe', shell: 'cmd.exe' });
        } else {
          fs.symlinkSync(nodeModulesSource, targetNM, 'junction');
        }
        console.log(`  🔗 ${shellProjects[i].shell} → linked node_modules`);
      } catch {
        // If symlink fails, do a full install
        if (!installDeps(shellProjects[i].dir)) {
          console.error(`  ❌ Failed to install deps for ${shellProjects[i].shell}`);
        } else {
          console.log(`  ✅ ${shellProjects[i].shell} → fresh install`);
        }
      }
    }

    // Phase 3: Start Vite servers + validate
    console.log('\nPhase 3: Starting Vite servers + running validation...');

    browser = await chromium.launch({ headless: true });

    for (const { shell, dir } of shellProjects) {
      process.stdout.write(`\n  🔄 ${shell}: starting Vite... `);

      try {
        const { process: viteProc, url } = await startViteServer(dir);
        viteProcesses.push(viteProc);
        process.stdout.write(`at ${url}\n`);

        // Validate
        const result = await validateShell(browser, shell, url);
        results.push(result);

        const icon = result.passed ? '✅' : '❌';
        const checkSummary = result.checks.map(c => c.passed ? '✓' : '✗').join('');
        console.log(`  ${icon} ${shell} | ${result.renderTime}ms | [${checkSummary}] | ${result.checks.filter(c => c.passed).length}/${result.checks.length} checks`);

        if (!result.passed) {
          for (const check of result.checks.filter(c => !c.passed)) {
            console.log(`     ↳ FAIL: ${check.name}: ${check.details}`);
          }
        }

        // Kill Vite after validation
        viteProc.kill('SIGTERM');
      } catch (err) {
        console.log(`  ❌ ${shell}: ${(err as Error).message}`);
        results.push({
          shell,
          passed: false,
          renderTime: 0,
          checks: [{ name: 'Server start', passed: false, details: (err as Error).message }],
          consoleErrors: [],
          screenshotPath: null,
        });
      }
    }

  } finally {
    // Cleanup
    if (browser) await browser.close();
    for (const proc of viteProcesses) {
      try { proc.kill('SIGTERM'); } catch {}
    }
    // Clean temp directory (remove junctions first on Windows)
    try {
      const dirs = fs.existsSync(TEMP_BASE) ? fs.readdirSync(TEMP_BASE) : [];
      for (const d of dirs) {
        const nmPath = path.join(TEMP_BASE, d, 'node_modules');
        try { fs.unlinkSync(nmPath); } catch {}
      }
      fs.rmSync(TEMP_BASE, { recursive: true, force: true });
    } catch {}
  }

  // ── Report ──
  console.log('\n' + '═'.repeat(90));
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`📊 Results: ${passedCount}/${results.length} shells passed | ${failedCount} failures`);

  if (passedCount === results.length) {
    console.log('🚀 All shells render and validate correctly in the browser!');
  }

  // Save JSON report
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    totalShells: results.length,
    passedShells: passedCount,
    failedShells: failedCount,
    results,
  };

  const reportPath = path.join(REPORTS_DIR, 'exploratory-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📁 Report: ${reportPath}`);

  // Print detailed results
  console.log('\n' + '─'.repeat(90));
  console.log('DETAILED RESULTS:');
  console.log('─'.repeat(90));

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`\n${icon} ${result.shell.toUpperCase()} (${result.renderTime}ms)`);
    for (const check of result.checks) {
      const ci = check.passed ? '  ✓' : '  ✗';
      console.log(`${ci} ${check.name}: ${check.details}`);
    }
    if (result.screenshotPath) {
      console.log(`  📸 Screenshot: ${result.screenshotPath}`);
    }
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
