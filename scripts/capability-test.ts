/**
 * Capability Validation Test — verifies capability extraction and shell compatibility.
 * No LLM calls, no API calls, no credits consumed.
 * Run: npx tsx scripts/capability-test.ts
 */

import { validateCapabilities, extractCapabilities, type Capability } from '../src/shells/capabilities.js';

interface CapTest {
  id: string;
  prompt: string;
  mustDetect: Capability[];           // Must be in detected list
  mustNotDetect?: Capability[];       // Must NOT be in detected list
  expectAbstain: boolean;
  description: string;
}

const TESTS: CapTest[] = [
  // ── Shell-compatible prompts: should NOT abstain ──
  {
    id: 'C01',
    prompt: 'Build a task management tool with search, filters, and detail views',
    mustDetect: ['searchable_records', 'filterable_records', 'detail_panel', 'crud_operations'],
    expectAbstain: false,
    description: 'Classic CRUD → no incompatible capabilities',
  },
  {
    id: 'C02',
    prompt: 'Create a sales analytics dashboard with KPI cards and charts',
    mustDetect: ['kpi_summary', 'chart_analytics'],
    expectAbstain: false,
    description: 'Dashboard → shell-friendly capabilities only',
  },
  {
    id: 'C03',
    prompt: 'Build a hiring pipeline board with stages and task flow',
    mustDetect: ['pipeline_board', 'stage_progression', 'task_flow'],
    expectAbstain: false,
    description: 'Kanban → all shell-friendly',
  },
  {
    id: 'C04',
    prompt: 'Create an onboarding wizard with intake form and recommendation result',
    mustDetect: ['intake_flow', 'recommendation_result'],
    expectAbstain: false,
    description: 'Wizard → all shell-friendly',
  },
  {
    id: 'C05',
    prompt: 'Build a landing page with hero section, features, pricing, and FAQ',
    mustDetect: ['hero_section', 'feature_grid', 'pricing_block', 'faq_section'],
    expectAbstain: false,
    description: 'Landing → all shell-friendly',
  },

  // ── Incompatible prompts: MUST abstain ──
  {
    id: 'C10',
    prompt: 'Build a collaborative whiteboard with canvas, drawing tools, and mini-map',
    mustDetect: ['freeform_canvas', 'drawing_tools'],
    expectAbstain: true,
    description: 'Whiteboard → freeform_canvas is incompatible',
  },
  {
    id: 'C11',
    prompt: 'Create a Slack-like chat app with channels and direct messages',
    mustDetect: ['chat_threads', 'clone_pattern'],
    expectAbstain: true,
    description: 'Chat app → chat_threads is incompatible',
  },
  {
    id: 'C12',
    prompt: 'Build an e-commerce store with shopping cart and checkout',
    mustDetect: ['cart_checkout'],
    expectAbstain: true,
    description: 'E-commerce → cart_checkout is incompatible',
  },
  {
    id: 'C13',
    prompt: 'Create a music player with playlists and now-playing screen',
    mustDetect: ['media_playback'],
    expectAbstain: true,
    description: 'Music player → media_playback is incompatible',
  },
  {
    id: 'C14',
    prompt: 'Build a map-based discovery app with map markers and radius filters',
    mustDetect: ['map_first_ui', 'geospatial_markers'],
    expectAbstain: true,
    description: 'Map app → map_first_ui is incompatible',
  },
  {
    id: 'C15',
    prompt: 'Create a diagram builder with nodes, arrows, and connector lines',
    mustDetect: ['diagram_connections'],
    expectAbstain: true,
    description: 'Diagram builder → diagram_connections is incompatible',
  },
  {
    id: 'C16',
    prompt: 'Build a social feed with posts, likes, upvotes, and following',
    mustDetect: ['feed_interactions'],
    expectAbstain: true,
    description: 'Social feed → feed_interactions is incompatible',
  },
  {
    id: 'C17',
    prompt: 'Create a browser game with level select, score HUD, and leaderboard',
    mustDetect: ['game_loop'],
    expectAbstain: true,
    description: 'Game → game_loop is incompatible',
  },
  {
    id: 'C18',
    prompt: 'Build a rich text document editor with slash commands and suggestion mode',
    mustDetect: ['rich_text_editing'],
    expectAbstain: true,
    description: 'Rich text editor → rich_text_editing is incompatible',
  },
  {
    id: 'C19',
    prompt: 'Create a course video player with chapter timeline and transcript search',
    mustDetect: ['chapter_timeline'],
    expectAbstain: true,
    description: 'Video player → chapter_timeline is incompatible',
  },

  // ── False positive guard: "transaction feed" should NOT trigger feed_interactions ──
  {
    id: 'C20',
    prompt: 'Build a finance app with transaction feed and spending charts',
    mustDetect: ['chart_analytics'],
    mustNotDetect: ['feed_interactions'],
    expectAbstain: false,
    description: 'Finance with "transaction feed" → NOT a social feed',
  },

  // ── Route planning ──
  {
    id: 'C21',
    prompt: 'Create a logistics route planner with delivery stops and route completion',
    mustDetect: ['route_planning'],
    expectAbstain: true,
    description: 'Route planner → route_planning is incompatible',
  },

  // ── Booking flow ──
  {
    id: 'C22',
    prompt: 'Build a travel booking interface with booking summary and guest selector',
    mustDetect: ['booking_flow'],
    expectAbstain: true,
    description: 'Travel booking → booking_flow is incompatible',
  },

  // ── Nested discussion ──
  {
    id: 'C23',
    prompt: 'Create a Reddit-style app with nested comments and threaded discussion',
    mustDetect: ['nested_discussion'],
    expectAbstain: true,
    description: 'Reddit clone → nested_discussion is incompatible',
  },
];

// ══════════════════════════════════════════════════
// RUN TESTS
// ══════════════════════════════════════════════════

console.log('FORGE — Capability Validation Test');
console.log('═'.repeat(90));
console.log(`Testing ${TESTS.length} prompts\n`);

let passed = 0;
let failed = 0;

for (const test of TESTS) {
  const result = validateCapabilities(test.prompt);
  const detected = new Set(result.capabilities.detected);
  let ok = true;
  const errors: string[] = [];

  // Check mustDetect
  for (const cap of test.mustDetect) {
    if (!detected.has(cap)) {
      ok = false;
      errors.push(`missing: ${cap}`);
    }
  }

  // Check mustNotDetect
  if (test.mustNotDetect) {
    for (const cap of test.mustNotDetect) {
      if (detected.has(cap)) {
        ok = false;
        errors.push(`false positive: ${cap}`);
      }
    }
  }

  // Check abstain
  if (test.expectAbstain !== result.shouldAbstain) {
    ok = false;
    errors.push(`abstain: expected ${test.expectAbstain}, got ${result.shouldAbstain}`);
  }

  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${test.id} | Abstain: ${result.shouldAbstain ? 'YES' : 'no '} | Caps: ${result.capabilities.detected.length} | Incomp: ${result.capabilities.incompatible.length} | ${test.description}`);

  if (!ok) {
    failed++;
    console.log(`   ↳ ERRORS: ${errors.join(', ')}`);
    console.log(`   ↳ Detected: [${result.capabilities.detected.join(', ')}]`);
  } else {
    passed++;
  }
}

console.log('\n' + '═'.repeat(90));
console.log(`📊 Results: ${passed}/${TESTS.length} passed | ${failed} failures`);

if (passed === TESTS.length) {
  console.log('🚀 All capability validation tests passed!');
}

process.exit(failed > 0 ? 1 : 0);
