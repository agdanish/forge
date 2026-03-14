/**
 * Fitness Gate Test — validates that the shell fitness scoring correctly
 * routes shell-appropriate prompts to shells and non-shell prompts to LLM.
 *
 * No LLM calls, no API calls, no credits consumed.
 * Run: npx tsx scripts/fitness-test.ts
 */

import { checkShellFitness } from '../src/shells/fitness.js';

interface FitnessTest {
  id: string;
  prompt: string;
  expected: 'shell' | 'llm';
  description: string;
}

const TESTS: FitnessTest[] = [
  // ══════════════════════════════════════════════════
  // SHOULD ROUTE TO SHELLS (score ≥ 50)
  // ══════════════════════════════════════════════════
  { id: 'S01', prompt: 'Build a task management tool for remote teams', expected: 'shell', description: 'Classic management tool → universal' },
  { id: 'S02', prompt: 'Create a sales analytics dashboard', expected: 'shell', description: 'Dashboard prompt' },
  { id: 'S03', prompt: 'Build a landing page for a SaaS startup', expected: 'shell', description: 'Landing page' },
  { id: 'S04', prompt: 'Create a hiring pipeline tracker', expected: 'shell', description: 'Kanban/pipeline' },
  { id: 'S05', prompt: 'Build a student onboarding wizard', expected: 'shell', description: 'Wizard/intake' },
  { id: 'S06', prompt: 'Make an expense tracker for freelancers', expected: 'shell', description: 'Tracker tool' },
  { id: 'S07', prompt: 'Build a CRM for small businesses', expected: 'shell', description: 'CRM' },
  { id: 'S08', prompt: 'Create a project management platform', expected: 'shell', description: 'Project management' },
  { id: 'S09', prompt: 'Build a patient scheduling system', expected: 'shell', description: 'Healthcare scheduler' },
  { id: 'S10', prompt: 'Create a content production workflow board', expected: 'shell', description: 'Workflow board' },
  { id: 'S11', prompt: 'Build a donation tracking dashboard for a charity', expected: 'shell', description: 'Nonprofit dashboard' },
  { id: 'S12', prompt: 'Make a habit tracker app', expected: 'shell', description: 'Habit tracker' },
  { id: 'S13', prompt: 'Build an inventory management system', expected: 'shell', description: 'Inventory tool' },
  { id: 'S14', prompt: 'Create a bug tracking tool', expected: 'shell', description: 'Issue tracker' },
  { id: 'S15', prompt: 'Build an app', expected: 'shell', description: 'Vague prompt — shell safer' },
  { id: 'S16', prompt: 'Create a tool for managing volunteers', expected: 'shell', description: 'Volunteer manager' },
  { id: 'S17', prompt: 'Build an eligibility assessment wizard', expected: 'shell', description: 'Assessment wizard' },
  { id: 'S18', prompt: 'Make a KPI monitoring dashboard', expected: 'shell', description: 'KPI dashboard' },
  { id: 'S19', prompt: 'Build a product showcase for a new AI tool', expected: 'shell', description: 'Product showcase' },
  { id: 'S20', prompt: 'Create a sprint planning board', expected: 'shell', description: 'Sprint board' },

  // ══════════════════════════════════════════════════
  // SHOULD ESCAPE TO LLM (score < 50)
  // ══════════════════════════════════════════════════
  { id: 'L01', prompt: 'Build a real-time chat app with rooms and direct messages', expected: 'llm', description: 'Chat app — shells cant do this' },
  { id: 'L02', prompt: 'Create a multiplayer tic-tac-toe game', expected: 'llm', description: 'Game' },
  { id: 'L03', prompt: 'Build an online store with shopping cart and checkout', expected: 'llm', description: 'E-commerce with cart' },
  { id: 'L04', prompt: 'Create a Twitter clone with feeds, likes, and follows', expected: 'llm', description: 'Social media clone' },
  { id: 'L05', prompt: 'Build a code editor with syntax highlighting', expected: 'llm', description: 'Code editor' },
  { id: 'L06', prompt: 'Create a music player with playlists', expected: 'llm', description: 'Music player' },
  { id: 'L07', prompt: 'Build a weather app that shows forecasts', expected: 'llm', description: 'Weather app' },
  { id: 'L08', prompt: 'Create a drawing canvas app like Paint', expected: 'llm', description: 'Drawing/canvas app' },
  { id: 'L09', prompt: 'Build a Wordle clone', expected: 'llm', description: 'Word game' },
  { id: 'L10', prompt: 'Create a social media feed with posts and comments', expected: 'llm', description: 'Social feed' },
  { id: 'L11', prompt: 'Build a Spotify-like music streaming interface', expected: 'llm', description: 'Spotify clone' },
  { id: 'L12', prompt: 'Create a Tetris game', expected: 'llm', description: 'Tetris game' },
  { id: 'L13', prompt: 'Build a markdown editor with live preview', expected: 'llm', description: 'Markdown editor' },
  { id: 'L14', prompt: 'Create an image gallery with upload and tagging', expected: 'llm', description: 'Image gallery with upload' },
  { id: 'L15', prompt: 'Build a messaging app like Slack', expected: 'llm', description: 'Slack clone' },
  { id: 'L16', prompt: 'Create a crypto trading dashboard with live prices', expected: 'llm', description: 'Crypto trading — needs live data' },
  { id: 'L17', prompt: 'Build a video player with playlist support', expected: 'llm', description: 'Video player' },
  { id: 'L18', prompt: 'Create a whiteboard collaboration tool', expected: 'llm', description: 'Whiteboard/canvas' },
  { id: 'L19', prompt: 'Build a snake game', expected: 'llm', description: 'Snake game' },
  { id: 'L20', prompt: 'Create an email client inbox', expected: 'llm', description: 'Email client' },
];

// Run tests
console.log('FORGE — Fitness Gate Test');
console.log('═'.repeat(80));
console.log(`Testing ${TESTS.length} prompts\n`);
console.log(`  ID     Score  Rec    Expected  Match  Prompt`);
console.log(`  ${'─'.repeat(74)}`);

let passed = 0;
let failed = 0;
const failures: FitnessTest[] = [];

for (const test of TESTS) {
  const result = checkShellFitness(test.prompt);
  const match = result.recommendation === test.expected;
  const icon = match ? '✅' : '❌';

  console.log(`  ${icon} ${test.id}  ${String(result.score).padStart(3)}    ${result.recommendation.padEnd(5)}  ${test.expected.padEnd(8)}  ${match ? 'OK' : 'FAIL'}   ${test.prompt.substring(0, 45)}`);

  if (match) {
    passed++;
  } else {
    failed++;
    failures.push(test);
    console.log(`         ↳ ${test.description} | Shell KW: ${result.matchedShellKeywords} | Escape KW: ${result.matchedEscapeKeywords} | ${result.reason}`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log(`\n📊 Results: ${passed}/${TESTS.length} passed | ${failed} failures`);

if (failures.length > 0) {
  console.log(`\n❌ Failures:`);
  for (const f of failures) {
    console.log(`   ${f.id}: "${f.prompt}" — expected ${f.expected}, ${f.description}`);
  }
}

if (passed === TESTS.length) {
  console.log('\n🚀 All fitness tests passed! Gate correctly routes shells vs LLM.');
}

process.exit(failed > 0 ? 1 : 0);
