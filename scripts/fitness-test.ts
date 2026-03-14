/**
 * Fitness Gate v2 Test — validates three-layer scoring (archetype + semantic + keyword).
 *
 * No LLM calls, no API calls, no credits consumed.
 * Run: npx tsx scripts/fitness-test.ts
 */

import { checkShellFitness } from '../src/shells/fitness.js';

interface FitnessTest {
  id: string;
  prompt: string;
  expected: 'shell' | 'llm' | 'composer';
  /** Legacy: also accept these recommendations as valid (for 3-lane migration) */
  alsoAccept?: ('shell' | 'llm' | 'composer')[];
  description: string;
}

const TESTS: FitnessTest[] = [
  // ══════════════════════════════════════════════════
  // SHOULD ROUTE TO SHELLS
  // ══════════════════════════════════════════════════

  // Universal shell — CRUD/management tools
  { id: 'S01', prompt: 'Build a task management tool for remote teams', expected: 'shell', description: 'Classic CRUD manager' },
  { id: 'S02', prompt: 'Create a CRM for tracking client relationships', expected: 'shell', description: 'CRM tool' },
  { id: 'S03', prompt: 'Make a project tracker for engineering sprints', expected: 'shell', description: 'Project tracker' },
  { id: 'S04', prompt: 'Build an expense tracker for freelancers', expected: 'shell', description: 'Finance tracker' },
  { id: 'S05', prompt: 'Create an inventory management system', expected: 'shell', description: 'Inventory manager' },
  { id: 'S06', prompt: 'Build a patient scheduling system for clinics', expected: 'shell', description: 'Healthcare scheduler' },
  { id: 'S07', prompt: 'Make a habit tracker app', expected: 'shell', description: 'Habit tracker' },
  { id: 'S08', prompt: 'Build a bug tracking tool for developers', expected: 'shell', description: 'Bug tracker' },
  { id: 'S09', prompt: 'Create a volunteer management tool for nonprofits', expected: 'shell', description: 'Volunteer manager' },
  { id: 'S10', prompt: 'Build a tool to manage student enrollment records', expected: 'shell', description: 'Enrollment records' },

  // Dashboard shell — analytics/metrics
  { id: 'S11', prompt: 'Build a sales analytics dashboard', expected: 'shell', description: 'Sales dashboard' },
  { id: 'S12', prompt: 'Create a metrics reporting panel for e-commerce', expected: 'shell', description: 'Metrics panel' },
  { id: 'S13', prompt: 'Make a KPI dashboard for tracking team performance', expected: 'shell', description: 'KPI dashboard' },
  { id: 'S14', prompt: 'Build a donation tracking dashboard for a charity', expected: 'shell', description: 'Nonprofit dashboard' },
  { id: 'S15', prompt: 'Create a data visualization dashboard for HR', expected: 'shell', description: 'HR analytics' },

  // Landing shell — showcases/marketing
  { id: 'S16', prompt: 'Build a landing page for a SaaS startup', expected: 'shell', description: 'SaaS landing' },
  { id: 'S17', prompt: 'Create a product showcase for a new AI tool', expected: 'shell', description: 'Product showcase' },
  { id: 'S18', prompt: 'Design a homepage for a climate tech company', expected: 'shell', description: 'Company homepage' },
  { id: 'S19', prompt: 'Make a portfolio page for a design agency', expected: 'shell', description: 'Portfolio page' },

  // Kanban shell — workflows/pipelines
  { id: 'S20', prompt: 'Build a hiring pipeline tracker', expected: 'shell', description: 'Hiring pipeline' },
  { id: 'S21', prompt: 'Create a content production workflow board', expected: 'shell', description: 'Content workflow' },
  { id: 'S22', prompt: 'Make a sprint board for agile teams', expected: 'shell', description: 'Sprint board' },
  { id: 'S23', prompt: 'Build a support escalation workflow tool', expected: 'shell', description: 'Escalation workflow' },

  // Wizard shell — guided flows
  { id: 'S24', prompt: 'Build a student onboarding wizard', expected: 'shell', description: 'Onboarding wizard' },
  { id: 'S25', prompt: 'Create an eligibility assessment for volunteers', expected: 'shell', description: 'Eligibility check' },
  { id: 'S26', prompt: 'Build a guided setup flow for a SaaS product', expected: 'shell', description: 'Setup wizard' },

  // Edge cases — vague/short prompts → shell is safer
  { id: 'S27', prompt: 'Build an app', expected: 'shell', description: 'Minimal prompt — shell safer' },
  { id: 'S28', prompt: 'Create a tool for managing operations', expected: 'shell', description: 'Generic management' },
  { id: 'S29', prompt: 'Build something for tracking donations', expected: 'shell', description: 'Vague tracking tool' },

  // Edge cases — domain-specific but manageable by shells
  { id: 'S30', prompt: 'Build a beekeeping management app for tracking hives and honey production', expected: 'shell', description: 'Niche CRUD — beekeeping' },
  { id: 'S31', prompt: 'Create a wine cellar inventory tracker', expected: 'shell', description: 'Niche CRUD — wine' },
  { id: 'S32', prompt: 'Make a pet adoption listing platform', expected: 'shell', description: 'Niche listing tool' },

  // Finance — shell-capable (tracker/manager pattern)
  { id: 'S33', prompt: 'Build a budget tracker to manage monthly expenses', expected: 'shell', description: 'Budget tracker' },
  { id: 'S34', prompt: 'Create an invoice management system for small businesses', expected: 'shell', description: 'Invoice manager' },

  // Real estate — shell-capable (listing/management)
  { id: 'S35', prompt: 'Build a property listing manager for real estate agents', expected: 'shell', description: 'Property manager' },

  // ══════════════════════════════════════════════════
  // SHOULD ESCAPE TO LLM
  // ══════════════════════════════════════════════════

  // Chat / messaging — LLM or Composer (chat-inbox kit)
  { id: 'L01', prompt: 'Build a real-time chat app with rooms and direct messages', expected: 'composer', alsoAccept: ['llm'], description: 'Chat app → composer chat-inbox' },
  { id: 'L02', prompt: 'Create an AI chatbot interface like ChatGPT', expected: 'llm', description: 'AI chat interface (no kit)' },
  { id: 'L03', prompt: 'Build a messaging app like Slack', expected: 'composer', alsoAccept: ['llm'], description: 'Slack clone → composer chat-inbox' },
  { id: 'L04', prompt: 'Create a Discord-like chat platform', expected: 'llm', alsoAccept: ['composer'], description: 'Discord clone' },

  // Games — LLM needed (no kit for games)
  { id: 'L05', prompt: 'Create a multiplayer tic-tac-toe game', expected: 'llm', description: 'Tic-tac-toe' },
  { id: 'L06', prompt: 'Build a Wordle clone', expected: 'llm', description: 'Wordle clone' },
  { id: 'L07', prompt: 'Create a Tetris game', expected: 'llm', description: 'Tetris' },
  { id: 'L08', prompt: 'Build a snake game', expected: 'llm', description: 'Snake game' },
  { id: 'L09', prompt: 'Make a trivia quiz game with scoring', expected: 'llm', description: 'Quiz game' },

  // E-commerce with cart — Composer (store-catalog kit) or LLM
  { id: 'L10', prompt: 'Build an online store with shopping cart and checkout', expected: 'composer', description: 'E-commerce store → composer store-catalog' },
  { id: 'L11', prompt: 'Create a marketplace where users can buy and sell items', expected: 'composer', alsoAccept: ['llm'], description: 'Marketplace → composer store-catalog' },
  { id: 'L12', prompt: 'Build an e-commerce product page with add to cart', expected: 'composer', alsoAccept: ['llm'], description: 'Product page → composer store-catalog' },

  // Social — Composer (feed-social kit) or LLM
  { id: 'L13', prompt: 'Create a Twitter clone with feeds, likes, and follows', expected: 'composer', description: 'Twitter clone → composer feed-social' },
  { id: 'L14', prompt: 'Build a social media feed with posts and comments', expected: 'composer', description: 'Social feed → composer feed-social' },
  { id: 'L15', prompt: 'Create a community platform with user profiles and posting', expected: 'composer', alsoAccept: ['llm'], description: 'Community platform → composer feed-social' },

  // Editors — Composer (editor-lite kit) or LLM
  { id: 'L16', prompt: 'Build a code editor with syntax highlighting', expected: 'llm', description: 'Code editor (too specialized for kit)' },
  { id: 'L17', prompt: 'Create a markdown editor with live preview', expected: 'llm', description: 'Markdown editor (too specialized for kit)' },
  { id: 'L18', prompt: 'Build a collaborative whiteboard tool', expected: 'composer', alsoAccept: ['llm'], description: 'Whiteboard → composer editor-lite' },
  { id: 'L19', prompt: 'Create a drawing canvas app', expected: 'llm', alsoAccept: ['composer'], description: 'Drawing canvas' },

  // Media players — Composer (media-player kit) or LLM
  { id: 'L20', prompt: 'Build a music player with playlists', expected: 'composer', description: 'Music player → composer media-player' },
  { id: 'L21', prompt: 'Create a video player with playlist support', expected: 'composer', description: 'Video player → composer media-player' },
  { id: 'L22', prompt: 'Build a Spotify-like music streaming interface', expected: 'composer', alsoAccept: ['llm'], description: 'Spotify clone → composer media-player' },

  // Calendar — LLM needed (no calendar kit)
  { id: 'L23', prompt: 'Build a monthly calendar app with event management', expected: 'llm', description: 'Calendar with month grid' },

  // Weather/live data — LLM needed
  { id: 'L24', prompt: 'Build a weather app that shows forecasts', expected: 'llm', description: 'Weather app' },
  { id: 'L25', prompt: 'Create a crypto trading dashboard with live prices', expected: 'llm', description: 'Crypto dashboard' },

  // Clone/like patterns — Composer (map-splitview kit) or LLM
  { id: 'L26', prompt: 'Build an Uber-like ride sharing app', expected: 'composer', alsoAccept: ['llm'], description: 'Uber clone → composer map-splitview' },
  { id: 'L27', prompt: 'Create a Netflix clone for streaming', expected: 'llm', alsoAccept: ['composer'], description: 'Netflix clone' },

  // File/image — LLM needed
  { id: 'L28', prompt: 'Build an image gallery with upload and tagging', expected: 'llm', description: 'Image gallery' },
  { id: 'L29', prompt: 'Create a file manager for cloud storage', expected: 'llm', description: 'File manager' },

  // Email — Composer (chat-inbox kit) or LLM
  { id: 'L30', prompt: 'Build an email client inbox', expected: 'composer', alsoAccept: ['llm'], description: 'Email client → composer chat-inbox' },

  // ══════════════════════════════════════════════════
  // BOUNDARY / TRICKY PROMPTS (the hardest cases)
  // ══════════════════════════════════════════════════

  // "product catalog" without cart → shell is fine (it's just a listing)
  { id: 'B01', prompt: 'Build a product catalog browser with filters and search', expected: 'shell', description: 'Product catalog without cart → shell' },

  // "event scheduler" without calendar grid → shell handles as CRUD
  { id: 'B02', prompt: 'Build an event scheduler for managing upcoming meetups', expected: 'shell', description: 'Event manager (CRUD, not calendar grid)' },

  // "quiz builder" (building quizzes, not playing them) → shell handles as CRUD
  { id: 'B03', prompt: 'Build a quiz builder tool for teachers to create exams', expected: 'shell', description: 'Quiz builder (CRUD, not game)' },

  // "portfolio with contact form" → landing shell
  { id: 'B04', prompt: 'Create a personal portfolio website with project showcase', expected: 'shell', description: 'Portfolio → landing shell' },
];

// ══════════════════════════════════════════════════
// RUN TESTS
// ══════════════════════════════════════════════════

console.log('FORGE — Fitness Gate v2 Test');
console.log('═'.repeat(90));
console.log(`Testing ${TESTS.length} prompts (3-layer scoring: archetype + semantic + keyword)\n`);
console.log(`  ID     Score  Rec       Expected  Archetype        Match  Prompt`);
console.log(`  ${'─'.repeat(90)}`);

let passed = 0;
let failed = 0;
const failures: { test: FitnessTest; result: ReturnType<typeof checkShellFitness> }[] = [];

for (const test of TESTS) {
  const result = checkShellFitness(test.prompt);
  const match = result.recommendation === test.expected ||
    (test.alsoAccept?.includes(result.recommendation as 'shell' | 'llm' | 'composer') ?? false);
  const icon = match ? '✅' : '❌';
  const arch = (result.detectedArchetype || '-').padEnd(16);

  console.log(`  ${icon} ${test.id.padEnd(4)} ${String(result.score).padStart(3)}    ${result.recommendation.padEnd(8)}  ${test.expected.padEnd(8)}  ${arch} ${match ? 'OK' : 'FAIL'}   ${test.prompt.substring(0, 40)}`);

  if (match) {
    passed++;
  } else {
    failed++;
    failures.push({ test, result });
    console.log(`         ↳ ${test.description} | Shell: ${result.matchedShellKeywords} | Escape: ${result.matchedEscapeKeywords} | ${result.reason}`);
  }
}

console.log('\n' + '═'.repeat(90));
console.log(`\n📊 Results: ${passed}/${TESTS.length} passed | ${failed} failures`);

// Show score distribution
const shellScores = TESTS.filter(t => t.expected === 'shell').map(t => checkShellFitness(t.prompt).score);
const nonShellScores = TESTS.filter(t => t.expected !== 'shell').map(t => checkShellFitness(t.prompt).score);
const shellMin = Math.min(...shellScores);
const shellMax = Math.max(...shellScores);
const nonShellMin = Math.min(...nonShellScores);
const nonShellMax = Math.max(...nonShellScores);

const composerCount = TESTS.filter(t => t.expected === 'composer').length;
const llmCount = TESTS.filter(t => t.expected === 'llm').length;

console.log(`\n📈 Score distribution:`);
console.log(`   Shell prompts: ${shellMin}-${shellMax} (should all be ≥50)`);
console.log(`   Non-shell:     ${nonShellMin}-${nonShellMax} (should all be <50)`);
console.log(`   Separation gap: ${shellMin - nonShellMax} points (higher = more robust)`);
console.log(`\n🔀 3-Lane routing: ${TESTS.filter(t => t.expected === 'shell').length} shell, ${composerCount} composer, ${llmCount} LLM`);

if (failures.length > 0) {
  console.log(`\n❌ Failures:`);
  for (const { test, result } of failures) {
    console.log(`   ${test.id}: "${test.prompt.substring(0, 50)}" — expected ${test.expected}, got ${result.recommendation} (score: ${result.score})`);
    console.log(`         ${test.description} | ${result.reason}`);
  }
}

if (passed === TESTS.length) {
  console.log('\n🚀 All fitness tests passed! 3-lane routing (shell → composer → LLM) is robust.');
}

process.exit(failed > 0 ? 1 : 0);
