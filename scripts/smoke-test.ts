/**
 * Comprehensive smoke test — validates all shell classes, domain packs,
 * routing, and weird-prompt handling in the deterministic pipeline.
 *
 * No LLM calls, no API calls, no credits consumed.
 * Run: npx tsx scripts/smoke-test.ts
 */

import { generateFallbackSpec } from '../src/shells/spec.js';
import { renderFromSpec } from '../src/shells/renderer.js';
import { getDomainPack, listDomainPacks } from '../src/shells/domainPacks.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  id: string;
  prompt: string;
  shell: string;
  domainPack: string | null;
  appName: string;
  domain: string;
  entity: string;
  categories: string;
  fileCount: number;
  appTsxLength: number;
  htmlTitle: string;
  timeMs: number;
  success: boolean;
  error?: string;
  notes: string[];
}

const TESTS: { id: string; prompt: string; expectedShell: string; expectedPack?: string }[] = [
  // Shell routing — universal
  { id: 'U1', prompt: 'Build a task management tool for remote teams', expectedShell: 'universal' },
  { id: 'U2', prompt: 'Create a CRM for tracking client relationships', expectedShell: 'universal' },
  { id: 'U3', prompt: 'Make a project tracker for engineering sprints', expectedShell: 'universal' },

  // Shell routing — dashboard
  { id: 'D1', prompt: 'Build a sales analytics dashboard', expectedShell: 'dashboard' },
  { id: 'D2', prompt: 'Create a metrics reporting panel for e-commerce', expectedShell: 'dashboard' },
  { id: 'D3', prompt: 'Make a KPI dashboard for tracking team performance', expectedShell: 'dashboard' },

  // Shell routing — landing
  { id: 'L1', prompt: 'Build a landing page for a SaaS startup', expectedShell: 'landing' },
  { id: 'L2', prompt: 'Create a product showcase for a new AI tool', expectedShell: 'landing' },
  { id: 'L3', prompt: 'Design a homepage for a climate tech company', expectedShell: 'landing' },
  { id: 'L4', prompt: 'Make a portfolio page for a design agency', expectedShell: 'landing' },

  // Domain packs — startup
  { id: 'P-S1', prompt: 'Build a SaaS growth dashboard for tracking MRR and churn', expectedShell: 'dashboard', expectedPack: 'startup' },
  { id: 'P-S2', prompt: 'Create a startup launch page for a B2B platform', expectedShell: 'landing', expectedPack: 'startup' },

  // Domain packs — nonprofit
  { id: 'P-N1', prompt: 'Build a volunteer management tool for a nonprofit', expectedShell: 'universal', expectedPack: 'nonprofit' },
  { id: 'P-N2', prompt: 'Create a donation tracking dashboard for a charity', expectedShell: 'dashboard', expectedPack: 'nonprofit' },

  // Domain packs — healthcare
  { id: 'P-H1', prompt: 'Build a patient appointment scheduling system', expectedShell: 'universal', expectedPack: 'healthcare' },
  { id: 'P-H2', prompt: 'Create a clinical outcomes dashboard', expectedShell: 'dashboard', expectedPack: 'healthcare' },

  // Domain packs — education
  { id: 'P-E1', prompt: 'Build a course enrollment tracker for a university', expectedShell: 'universal', expectedPack: 'education' },
  { id: 'P-E2', prompt: 'Create a student progress analytics dashboard', expectedShell: 'dashboard', expectedPack: 'education' },

  // Domain packs — operations
  { id: 'P-O1', prompt: 'Build an IT helpdesk ticketing system', expectedShell: 'universal', expectedPack: 'operations' },

  // Domain packs — creator
  { id: 'P-C1', prompt: 'Build a podcast episode tracker and guest outreach tool', expectedShell: 'universal', expectedPack: 'creator' },
  { id: 'P-C2', prompt: 'Create a content creator analytics dashboard', expectedShell: 'dashboard', expectedPack: 'creator' },

  // Weird / edge cases
  { id: 'W1', prompt: 'Build a tool to help indie filmmakers coordinate festival submissions', expectedShell: 'universal' },
  { id: 'W2', prompt: 'Make a dashboard for neighborhood volunteering participation', expectedShell: 'dashboard' },
  { id: 'W3', prompt: 'Build a landing page for a reusable packaging startup', expectedShell: 'landing' },
  { id: 'W4', prompt: 'yo make me a sick app for tracking sneaker drops', expectedShell: 'universal' },
  { id: 'W5', prompt: 'Build an app', expectedShell: 'universal' },
  { id: 'W6', prompt: 'Create a platform that helps small businesses manage operations', expectedShell: 'landing' },

  // Showcase-context routing (P4 refinement)
  { id: 'R1', prompt: 'Build a product for parents to manage after-school routines', expectedShell: 'landing' },
  { id: 'R2', prompt: 'Create a service platform that helps freelancers find work', expectedShell: 'landing' },
];

const results: TestResult[] = [];
let passed = 0, shellMismatch = 0, packMismatch = 0, failures = 0;

console.log('FORGE — Comprehensive Smoke Test');
console.log('═'.repeat(80));
console.log(`Testing ${TESTS.length} prompts | ${listDomainPacks().length} domain packs available\n`);

for (const test of TESTS) {
  const start = Date.now();
  const notes: string[] = [];
  try {
    const spec = generateFallbackSpec(test.prompt);
    const result = renderFromSpec(spec);
    const elapsed = Date.now() - start;
    const pack = getDomainPack(test.prompt);
    const htmlFile = result.files.find(f => f.path === 'index.html');
    const titleMatch = htmlFile?.content.match(/<title>(.*?)<\/title>/);

    // Check routing
    const shellOk = result.shell === test.expectedShell;
    if (!shellOk) {
      notes.push(`SHELL MISMATCH: got ${result.shell}, expected ${test.expectedShell}`);
      shellMismatch++;
    }

    // Check domain pack
    const packOk = !test.expectedPack || pack?.id === test.expectedPack;
    if (!packOk) {
      notes.push(`PACK MISMATCH: got ${pack?.id || 'none'}, expected ${test.expectedPack}`);
      packMismatch++;
    }

    // Check quality signals
    if (result.appTsx.length < 1000) notes.push('WARNING: App.tsx suspiciously short');
    if (result.files.length < 8) notes.push('WARNING: fewer than 8 files');
    if (titleMatch?.[1] === 'App') notes.push('WARNING: HTML title not customized');

    const icon = shellOk && packOk ? '✅' : '⚠️';
    console.log(`  ${icon} ${test.id.padEnd(6)} ${result.shell.padEnd(10)} ${(pack?.id || '-').padEnd(12)} ${elapsed}ms  ${spec.appName.padEnd(30)} ${test.prompt.substring(0, 45)}`);
    if (notes.length > 0) notes.forEach(n => console.log(`         ${n}`));

    if (shellOk && packOk) passed++;

    results.push({
      id: test.id,
      prompt: test.prompt,
      shell: result.shell,
      domainPack: pack?.id || null,
      appName: spec.appName,
      domain: spec.domain,
      entity: spec.primaryEntity,
      categories: spec.categories.slice(0, 3).join(', '),
      fileCount: result.files.length,
      appTsxLength: result.appTsx.length,
      htmlTitle: titleMatch?.[1] || 'unknown',
      timeMs: elapsed,
      success: true,
      notes,
    });
  } catch (err) {
    const elapsed = Date.now() - start;
    failures++;
    console.log(`  ❌ ${test.id.padEnd(6)} ERROR      -            ${elapsed}ms  ${(err as Error).message.substring(0, 50)}`);
    results.push({
      id: test.id,
      prompt: test.prompt,
      shell: 'ERROR',
      domainPack: null,
      appName: 'N/A',
      domain: 'N/A',
      entity: 'N/A',
      categories: '',
      fileCount: 0,
      appTsxLength: 0,
      htmlTitle: 'N/A',
      timeMs: elapsed,
      success: false,
      error: (err as Error).message,
      notes: ['CRASH'],
    });
  }
}

// Summary
console.log('\n' + '═'.repeat(80));
const total = TESTS.length;
const avgTime = Math.round(results.reduce((s, r) => s + r.timeMs, 0) / total);
const shells = { universal: 0, dashboard: 0, landing: 0, ERROR: 0 };
results.forEach(r => { shells[r.shell as keyof typeof shells] = (shells[r.shell as keyof typeof shells] || 0) + 1; });
const packsUsed = new Set(results.filter(r => r.domainPack).map(r => r.domainPack)).size;

console.log(`\n📊 Results: ${passed}/${total} passed | ${shellMismatch} shell mismatches | ${packMismatch} pack mismatches | ${failures} crashes`);
console.log(`⏱  Avg: ${avgTime}ms | Shells: U=${shells.universal} D=${shells.dashboard} L=${shells.landing} | Domain packs used: ${packsUsed}/${listDomainPacks().length}`);

if (shellMismatch > 0) {
  console.log(`\n⚠️  Shell mismatches need review:`);
  results.filter(r => r.notes.some(n => n.includes('SHELL MISMATCH'))).forEach(r => {
    console.log(`   ${r.id}: "${r.prompt.substring(0, 50)}" → ${r.notes.find(n => n.includes('SHELL'))}`);
  });
}

if (failures > 0) {
  console.log(`\n❌ Crashes:`);
  results.filter(r => !r.success).forEach(r => console.log(`   ${r.id}: ${r.error}`));
}

if (passed === total) {
  console.log('\n🚀 All tests passed! Shell routing, domain packs, and rendering are solid.');
}

// Write report
const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
const reportPath = join(reportDir, `smoke-test-${Date.now()}.json`);
writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: { total, passed, shellMismatch, packMismatch, failures, avgTime, shells, packsUsed },
  results,
}, null, 2));
console.log(`\n📄 Report: ${reportPath}`);
