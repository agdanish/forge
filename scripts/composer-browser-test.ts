/**
 * Composer Browser Validation Harness
 *
 * Composes each kit into a real Vite+React project, opens in headless Chromium,
 * and validates against kit capability contracts.
 *
 * No LLM calls. No API calls. No credits consumed.
 * Run: npx tsx scripts/composer-browser-test.ts
 */

import { chromium, type Browser, type Page } from 'playwright';
import { composeFromPrompt } from '../src/composer/composer.js';
import { ALL_COMPOSER_FIXTURES } from './fixtures/composer-fixtures.js';
import { KIT_CONTRACTS, type KitContract, type InteractiveCheck } from './composer-contracts.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn, type ChildProcess } from 'child_process';

// ══════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════

interface KitValidationResult {
  kit: string;
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

// ══════════════════════════════════════════════════
// TEMP PROJECT SETUP
// ══════════════════════════════════════════════════

const TEMP_BASE = path.join(process.cwd(), '.composer-tmp', `run-${Date.now()}`);
const REPORTS_DIR = path.join(process.cwd(), 'reports', 'composer');

function ensureDirs() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function writeKitProject(kitId: string, files: { path: string; content: string }[]): string {
  const projectDir = path.join(TEMP_BASE, kitId);

  if (fs.existsSync(projectDir)) {
    try {
      const nmPath = path.join(projectDir, 'node_modules');
      if (fs.existsSync(nmPath)) {
        try { fs.unlinkSync(nmPath); } catch {
          try { fs.rmSync(nmPath, { recursive: true, force: true }); } catch {}
        }
      }
      fs.rmSync(projectDir, { recursive: true, force: true });
    } catch {}
  }

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
  } catch {
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

async function checkRequiredSelectors(page: Page, contract: KitContract): Promise<CheckResult[]> {
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

async function checkRequiredText(page: Page, contract: KitContract): Promise<CheckResult[]> {
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

async function checkAboveFold(page: Page, contract: KitContract): Promise<CheckResult> {
  const viewport = page.viewportSize() || { width: 1280, height: 800 };
  const count = await page.evaluate((foldHeight: number) => {
    const elements = document.querySelectorAll('button, input, h1, h2, h3, [class*="card"], nav, img, svg');
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
    let element = page.locator(check.selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      if (check.selector.includes(':has-text')) {
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

    const beforeHTML = await page.content();

    try {
      if (check.typeText) {
        await element.fill(check.typeText, { timeout: 3000 });
        await page.waitForTimeout(500);
      } else {
        await element.click({ timeout: 3000 });
        await page.waitForTimeout(500);
      }
    } catch {
      return {
        name: `Interactive: ${check.description}`,
        passed: check.optional === true,
        details: check.optional ? 'Interaction failed (optional, skipped)' : 'Interaction failed',
      };
    }

    const afterHTML = await page.content();
    const changed = beforeHTML !== afterHTML;

    return {
      name: `Interactive: ${check.description}`,
      passed: changed,
      details: changed ? 'DOM changed after interaction ✓' : 'No DOM change detected',
    };
  } catch (err) {
    return {
      name: `Interactive: ${check.description}`,
      passed: check.optional === true,
      details: `Error: ${(err as Error).message}`,
    };
  }
}

// ══════════════════════════════════════════════════
// VALIDATE A SINGLE KIT
// ══════════════════════════════════════════════════

async function validateKit(browser: Browser, kitId: string, url: string): Promise<KitValidationResult> {
  const contract = KIT_CONTRACTS[kitId];
  const checks: CheckResult[] = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  const startTime = Date.now();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const renderTime = Date.now() - startTime;

    checks.push(...await checkRequiredSelectors(page, contract));
    checks.push(...await checkRequiredText(page, contract));
    checks.push(await checkAboveFold(page, contract));

    for (const ic of contract.interactiveChecks) {
      checks.push(await checkInteractive(page, ic));
    }

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

    let screenshotPath: string | null = null;
    try {
      screenshotPath = path.join(REPORTS_DIR, `${kitId}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch { screenshotPath = null; }

    return {
      kit: kitId,
      passed: checks.every(c => c.passed),
      renderTime,
      checks,
      consoleErrors: realErrors,
      screenshotPath,
    };
  } catch (err) {
    checks.push({
      name: 'Page load',
      passed: false,
      details: `Failed: ${(err as Error).message}`,
    });
    return {
      kit: kitId,
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
// MAIN
// ══════════════════════════════════════════════════

const kitPrompts: Record<string, string> = {
  'chat-inbox': 'Build a customer support inbox with threaded conversations',
  'feed-social': 'Create a community feed like Reddit with posts and comments',
  'store-catalog': 'Build an e-commerce store with product catalog and shopping cart',
  'map-splitview': 'Create a hotel booking app with map view and property listings',
  'media-player': 'Build a music player app like Spotify with playlists',
  'editor-lite': 'Create a poster designer tool with canvas and shapes',
};

async function main() {
  console.log('FORGE — Composer Browser Validation');
  console.log('═'.repeat(90));
  console.log('Composing all 6 kits → Vite → Playwright → Contract validation\n');

  ensureDirs();

  const kitIds = Object.keys(ALL_COMPOSER_FIXTURES);
  const results: KitValidationResult[] = [];
  const viteProcesses: ChildProcess[] = [];
  let browser: Browser | null = null;

  try {
    // Phase 1: Compose all kits
    console.log('Phase 1: Composing kits...');
    const kitProjects: { kitId: string; dir: string }[] = [];

    for (const kitId of kitIds) {
      const fixture = ALL_COMPOSER_FIXTURES[kitId as keyof typeof ALL_COMPOSER_FIXTURES];
      const prompt = kitPrompts[kitId] || `Build a ${kitId} app`;
      const composed = composeFromPrompt(prompt, fixture);

      if (!composed) {
        console.log(`  ❌ ${kitId} — composition failed`);
        continue;
      }

      const projectDir = writeKitProject(kitId, composed.files);
      kitProjects.push({ kitId, dir: projectDir });
      console.log(`  ✅ ${kitId} → ${composed.files.length} files (${composed.appTsx.length} chars)`);
    }

    // Phase 2: Install deps
    console.log('\nPhase 2: Installing dependencies...');
    const firstDir = kitProjects[0].dir;
    if (!installDeps(firstDir)) {
      throw new Error('Failed to install dependencies');
    }
    console.log(`  ✅ Dependencies installed in ${kitProjects[0].kitId}`);

    const nodeModulesSource = path.join(firstDir, 'node_modules');
    for (let i = 1; i < kitProjects.length; i++) {
      const targetNM = path.join(kitProjects[i].dir, 'node_modules');
      try {
        if (process.platform === 'win32') {
          execSync(`mklink /J "${targetNM}" "${nodeModulesSource}"`, { stdio: 'pipe', shell: 'cmd.exe' });
        } else {
          fs.symlinkSync(nodeModulesSource, targetNM, 'junction');
        }
        console.log(`  🔗 ${kitProjects[i].kitId} → linked node_modules`);
      } catch {
        if (!installDeps(kitProjects[i].dir)) {
          console.error(`  ❌ Failed for ${kitProjects[i].kitId}`);
        } else {
          console.log(`  ✅ ${kitProjects[i].kitId} → fresh install`);
        }
      }
    }

    // Phase 3: Validate each kit
    console.log('\nPhase 3: Starting Vite servers + running validation...');
    browser = await chromium.launch({ headless: true });

    for (const { kitId, dir } of kitProjects) {
      process.stdout.write(`\n  🔄 ${kitId}: starting Vite... `);

      try {
        const { process: viteProc, url } = await startViteServer(dir);
        viteProcesses.push(viteProc);
        process.stdout.write(`at ${url}\n`);

        const result = await validateKit(browser, kitId, url);
        results.push(result);

        const icon = result.passed ? '✅' : '❌';
        const checkSummary = result.checks.map(c => c.passed ? '✓' : '✗').join('');
        console.log(`  ${icon} ${kitId} | ${result.renderTime}ms | [${checkSummary}] | ${result.checks.filter(c => c.passed).length}/${result.checks.length} checks`);

        if (!result.passed) {
          for (const check of result.checks.filter(c => !c.passed)) {
            console.log(`     ↳ FAIL: ${check.name}: ${check.details}`);
          }
        }

        viteProc.kill('SIGTERM');
      } catch (err) {
        console.log(`  ❌ ${kitId}: ${(err as Error).message}`);
        results.push({
          kit: kitId,
          passed: false,
          renderTime: 0,
          checks: [{ name: 'Server start', passed: false, details: (err as Error).message }],
          consoleErrors: [],
          screenshotPath: null,
        });
      }
    }

  } finally {
    if (browser) await browser.close();
    for (const proc of viteProcesses) {
      try { proc.kill('SIGTERM'); } catch {}
    }
    try {
      const dirs = fs.existsSync(TEMP_BASE) ? fs.readdirSync(TEMP_BASE) : [];
      for (const d of dirs) {
        const nmPath = path.join(TEMP_BASE, d, 'node_modules');
        try { fs.unlinkSync(nmPath); } catch {}
      }
      fs.rmSync(TEMP_BASE, { recursive: true, force: true });
    } catch {}
  }

  // Report
  console.log('\n' + '═'.repeat(90));
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`📊 Results: ${passedCount}/${results.length} kits passed | ${failedCount} failures`);

  if (passedCount === results.length) {
    console.log('🚀 All composer kits render and validate correctly in the browser!');
  }

  const report = {
    timestamp: new Date().toISOString(),
    totalKits: results.length,
    passedKits: passedCount,
    failedKits: failedCount,
    results,
  };

  const reportPath = path.join(REPORTS_DIR, 'composer-browser-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📁 Report: ${reportPath}`);

  // Detailed
  console.log('\n' + '─'.repeat(90));
  console.log('DETAILED RESULTS:');
  console.log('─'.repeat(90));

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`\n${icon} ${result.kit.toUpperCase()} (${result.renderTime}ms)`);
    for (const check of result.checks) {
      console.log(`  ${check.passed ? '✓' : '✗'} ${check.name}: ${check.details}`);
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
