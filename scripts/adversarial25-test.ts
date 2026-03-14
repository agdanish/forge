/**
 * Adversarial 25 — Hardening test for fitness gate + shell routing.
 * No LLM calls, no API calls, no credits consumed.
 * Run: npx tsx scripts/adversarial25-test.ts
 */

import { checkShellFitness, FitnessResult } from '../src/shells/fitness.js';
import { generateFallbackSpec } from '../src/shells/spec.js';
import { getDomainPack } from '../src/shells/domainPacks.js';
import { getThemeForDomain } from '../src/shells/themes.js';
import * as fs from 'fs';
import * as path from 'path';

interface AdversarialPrompt {
  id: number;
  prompt: string;
  expectedRoute: 'shell' | 'llm' | 'borderline';
  expectedShell?: string;  // If shell, which one
  category: string;
  reason: string;
}

const PROMPTS: AdversarialPrompt[] = [
  // ── CANVAS / EDITOR / DIAGRAM (should escape to LLM) ──
  {
    id: 1,
    prompt: 'Build a polished collaborative whiteboard app with shared rooms, sticky notes, connector lines, freehand drawing, cursor presence, comments, and a mini-map. Users should be able to create, move, resize, and color notes on an infinite-feeling canvas.',
    expectedRoute: 'llm',
    category: 'canvas/editor',
    reason: 'Whiteboard with drawing, canvas, drag-drop — shells cannot represent this',
  },
  {
    id: 2,
    prompt: 'Create a team brainstorming canvas where users can add idea cards, group them into clusters, vote on cards, and switch between board view and affinity-map view. Include drag interactions, zoom controls, and a live activity sidebar.',
    expectedRoute: 'llm',
    category: 'canvas/editor',
    reason: 'Canvas with drag, zoom, clustering — too interactive for shells',
  },
  {
    id: 3,
    prompt: 'Build a rich text document editor with inline comments, suggestion mode, outline navigation, slash-command insertion, and a side panel showing comment threads and document history.',
    expectedRoute: 'llm',
    category: 'canvas/editor',
    reason: 'Rich text editor with slash commands — completely custom UI',
  },
  {
    id: 4,
    prompt: 'Create a workflow diagram builder where users can place nodes, connect them with arrows, edit labels, change node colors, and export the result view. Include a side palette for node types and a properties panel.',
    expectedRoute: 'llm',
    category: 'canvas/editor',
    reason: 'Diagram builder with node placement — canvas-based, not shell-compatible',
  },
  {
    id: 5,
    prompt: 'Build a low-fidelity UI wireframing tool with draggable components like buttons, cards, navbars, and forms. Users should be able to place blocks on a canvas, edit labels, and preview the generated mock screen.',
    expectedRoute: 'llm',
    category: 'canvas/editor',
    reason: 'Wireframing tool with draggable canvas — completely custom',
  },

  // ── CHAT / SOCIAL / COMMUNITY (should escape to LLM) ──
  {
    id: 6,
    prompt: 'Build a Slack-like team chat app with channels, direct messages, unread badges, typing indicators, pinned messages, emoji reactions, message search, and a responsive mobile sidebar.',
    expectedRoute: 'llm',
    category: 'chat/social',
    reason: 'Slack clone with channels, DMs, typing indicators — chat UI',
  },
  {
    id: 7,
    prompt: 'Create a Reddit-style discussion app with topic communities, nested comments, upvotes/downvotes, post composer, trending topics, and hot/new/top sorting.',
    expectedRoute: 'llm',
    category: 'chat/social',
    reason: 'Reddit clone with nested comments, voting — social feed',
  },
  {
    id: 8,
    prompt: 'Build a social feed app where users can create posts with images and tags, like and comment on posts, filter by topic, and switch between following, trending, and saved tabs.',
    expectedRoute: 'llm',
    category: 'chat/social',
    reason: 'Social feed with posts, likes, comments — social media UI',
  },
  {
    id: 9,
    prompt: 'Create a Discord-inspired voice-room coordination UI with servers, rooms, member presence, event scheduling, and role-based member panels. Focus on the interaction design and live room state.',
    expectedRoute: 'llm',
    category: 'chat/social',
    reason: 'Discord clone with voice rooms, presence — real-time social',
  },

  // ── BORDERLINE: SUPPORT INBOX ──
  {
    id: 10,
    prompt: 'Build a customer support inbox where agents can switch between conversations, tag users, assign tickets, see conversation history, use canned replies, and mark threads resolved/escalated.',
    expectedRoute: 'borderline',
    expectedShell: 'universal',
    category: 'support/inbox',
    reason: 'Could be universal shell (ticket manager) OR needs chat-like conversation UI. Borderline — shell acceptable if ticket-focused, LLM if conversation-focused.',
  },

  // ── E-COMMERCE / CART (should escape to LLM) ──
  {
    id: 11,
    prompt: 'Build an e-commerce store with product grid, filters, product detail pages, cart drawer, saved items, coupon input, shipping summary, and a multi-step checkout experience.',
    expectedRoute: 'llm',
    category: 'ecommerce',
    reason: 'Full e-commerce with cart, checkout — shells cannot represent this',
  },
  {
    id: 12,
    prompt: 'Create a food delivery ordering app with restaurant cards, cuisine filters, menu detail modals, item customization, cart editing, delivery ETA selection, and order tracking view.',
    expectedRoute: 'llm',
    category: 'ecommerce',
    reason: 'Food delivery with cart, ordering, tracking — complex custom UI',
  },
  {
    id: 13,
    prompt: 'Build a marketplace where users can browse service providers, compare profiles, shortlist options, request quotes, and view a side-by-side comparison panel before booking.',
    expectedRoute: 'llm',
    category: 'ecommerce',
    reason: 'Marketplace with comparison, quoting — beyond shell capability',
  },
  {
    id: 14,
    prompt: 'Create a travel booking interface for stays or trips with search, date selection, guest selector, result cards, map/list split view, saved itineraries, and booking summary flow.',
    expectedRoute: 'llm',
    category: 'ecommerce',
    reason: 'Travel booking with date picker, map, booking flow — complex custom',
  },

  // ── BORDERLINE: SAAS PLAN BUILDER ──
  {
    id: 15,
    prompt: 'Build a SaaS plan builder where users can configure seats, modules, billing cycle, add-ons, and compare tiers dynamically. Show total pricing changes in real time.',
    expectedRoute: 'borderline',
    expectedShell: 'wizard',
    category: 'configurator',
    reason: 'Could fit wizard shell (step-by-step config) or landing shell (pricing). Borderline — shell acceptable if simplified, LLM if full dynamic pricing needed.',
  },

  // ── MAP / LOCATION HEAVY (should escape to LLM) ──
  {
    id: 16,
    prompt: 'Build an Uber-like ride booking app with pickup/dropoff inputs, vehicle selection cards, fare estimate panel, live trip status timeline, saved places, and driver matching screen.',
    expectedRoute: 'llm',
    category: 'map/location',
    reason: 'Uber clone with map, live tracking — completely custom',
  },
  {
    id: 17,
    prompt: 'Create a logistics route planner where users can add multiple delivery stops, reorder them, see priority badges, switch between route list and map summary mode, and track route completion progress.',
    expectedRoute: 'llm',
    category: 'map/location',
    reason: 'Route planner with map, reordering — needs custom UI',
  },
  {
    id: 18,
    prompt: 'Build a location-based discovery app for cafes, events, and community spots with category chips, radius filters, place detail panels, bookmarked places, and route/action buttons.',
    expectedRoute: 'llm',
    category: 'map/location',
    reason: 'Location discovery with map, radius filters — map-heavy UI',
  },
  {
    id: 19,
    prompt: 'Create a real-estate browsing app with listing cards, price filters, saved homes, map/list split layout, neighborhood insights, and a property comparison tray.',
    expectedRoute: 'llm',
    category: 'map/location',
    reason: 'Real estate with map/list split, comparison — needs custom layout',
  },
  {
    id: 20,
    prompt: 'Build a public incident monitoring UI with map markers, incident severity filters, time slider, detail panel, response status board, and resource deployment summary.',
    expectedRoute: 'llm',
    category: 'map/location',
    reason: 'Incident monitoring with map markers, time slider — map + timeline UI',
  },

  // ── MEDIA / PLAYER (should escape to LLM) ──
  {
    id: 21,
    prompt: 'Build a Spotify-like music player with playlists, queue panel, now-playing screen, progress bar, saved tracks, search, and library/sidebar navigation.',
    expectedRoute: 'llm',
    category: 'media/player',
    reason: 'Spotify clone with audio player, queue — media player UI',
  },
  {
    id: 22,
    prompt: 'Create a course video player app with chapter timeline, notes panel, bookmarks, transcript search, lesson list, quiz checkpoints, and progress tracking.',
    expectedRoute: 'llm',
    category: 'media/player',
    reason: 'Video player with chapters, transcript — media-heavy custom UI',
  },

  // ── DESIGN / GAME (should escape to LLM) ──
  {
    id: 23,
    prompt: 'Build a simple poster designer where users can pick templates, edit text blocks, change colors, reposition elements, and preview/download the final design view.',
    expectedRoute: 'llm',
    category: 'canvas/editor',
    reason: 'Poster designer with canvas manipulation — editor/design tool',
  },
  {
    id: 24,
    prompt: 'Create a polished browser game interface with start screen, level select, score HUD, settings modal, pause/resume flow, leaderboard view, and keyboard/game control hints.',
    expectedRoute: 'llm',
    category: 'game',
    reason: 'Browser game with levels, HUD, controls — game UI',
  },

  // ── BORDERLINE: FINANCE APP ──
  {
    id: 25,
    prompt: 'Build a finance app that combines account overview, transaction feed, budget categories, spending charts, savings goals, bill reminders, and a guided setup flow for first-time users.',
    expectedRoute: 'borderline',
    expectedShell: 'dashboard',
    category: 'finance',
    reason: 'Finance dashboard with charts + transactions. Could work as dashboard shell. Borderline because guided setup and transaction feed add complexity.',
  },
];

// ══════════════════════════════════════════════════
// RUN ALL 25 THROUGH FITNESS + SPEC ROUTING
// ══════════════════════════════════════════════════

interface TestResult {
  id: number;
  prompt: string;
  category: string;
  expectedRoute: string;
  expectedShell: string | null;
  actualRecommendation: string;
  fitnessScore: number;
  detectedArchetype: string | null;
  shellKeywords: number;
  escapeKeywords: number;
  reason: string;
  fallbackShell: string | null;
  domainPack: string | null;
  theme: string;
  correct: boolean;
  notes: string;
}

const results: TestResult[] = [];

console.log('FORGE — Adversarial 25 Hardening Test');
console.log('═'.repeat(100));
console.log('No LLM calls. No API calls. No credits consumed.\n');

let correct = 0;
let incorrect = 0;
let borderlineOk = 0;

for (const p of PROMPTS) {
  const fitness = checkShellFitness(p.prompt);

  // Also check what fallback spec would generate
  let fallbackShell: string | null = null;
  try {
    const spec = generateFallbackSpec(p.prompt);
    fallbackShell = spec.shell;
  } catch { fallbackShell = null; }

  const domainPack = getDomainPack(p.prompt);
  const theme = getThemeForDomain(p.prompt);

  // Determine correctness
  // With the 3-lane architecture, 'composer' is also valid for prompts that
  // previously expected 'llm' — the composer lane is specifically designed
  // to catch prompts that shells can't handle but kits can serve deterministically.
  let isCorrect: boolean;
  let notes = '';

  if (p.expectedRoute === 'borderline') {
    // Borderline: shell, composer, or llm are all acceptable
    isCorrect = true;
    borderlineOk++;
    notes = `Borderline → routed to ${fitness.recommendation} (score: ${fitness.score}). Acceptable.`;
  } else if (p.expectedRoute === fitness.recommendation) {
    isCorrect = true;
    notes = 'Correct route.';
  } else if (p.expectedRoute === 'llm' && fitness.recommendation === 'composer') {
    // Composer lane catches prompts that used to go to LLM — this is CORRECT behavior
    isCorrect = true;
    notes = `Upgraded: LLM → composer (${fitness.composerScoring?.selectedKits?.[0] || 'unknown'} kit). Good — deterministic > expensive LLM.`;
  } else {
    isCorrect = false;
    notes = `WRONG: expected ${p.expectedRoute}, got ${fitness.recommendation} (score: ${fitness.score}). ${p.reason}`;
  }

  if (isCorrect) correct++;
  else incorrect++;

  const icon = isCorrect ? '✅' : '❌';
  const archStr = (fitness.detectedArchetype || '-').padEnd(18);
  const recStr = fitness.recommendation.padEnd(5);
  const expStr = p.expectedRoute.padEnd(10);

  console.log(`${icon} #${String(p.id).padStart(2)} | Score: ${String(fitness.score).padStart(3)} | Rec: ${recStr} | Exp: ${expStr} | Arch: ${archStr} | ${p.category}`);
  if (!isCorrect) {
    console.log(`   ↳ ${notes}`);
  }

  results.push({
    id: p.id,
    prompt: p.prompt.substring(0, 80),
    category: p.category,
    expectedRoute: p.expectedRoute,
    expectedShell: p.expectedShell || null,
    actualRecommendation: fitness.recommendation,
    fitnessScore: fitness.score,
    detectedArchetype: fitness.detectedArchetype,
    shellKeywords: fitness.matchedShellKeywords,
    escapeKeywords: fitness.matchedEscapeKeywords,
    reason: fitness.reason,
    fallbackShell: fallbackShell,
    domainPack: domainPack?.id || null,
    theme: theme.id,
    correct: isCorrect,
    notes,
  });
}

console.log('\n' + '═'.repeat(100));
console.log(`\n📊 Results: ${correct}/${PROMPTS.length} correct | ${incorrect} failures | ${borderlineOk} borderline`);

if (incorrect > 0) {
  console.log('\n❌ FAILURES (must fix):');
  for (const r of results.filter(r => !r.correct)) {
    console.log(`   #${r.id}: Score ${r.fitnessScore} → ${r.actualRecommendation} (expected ${r.expectedRoute})`);
    console.log(`   Archetype: ${r.detectedArchetype || 'none'} | Shell KW: ${r.shellKeywords} | Escape KW: ${r.escapeKeywords}`);
    console.log(`   ${r.reason}`);
    console.log(`   Fallback shell: ${r.fallbackShell} | Domain: ${r.domainPack}`);
    console.log('');
  }
}

// Write reports
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

fs.writeFileSync(
  path.join(reportsDir, 'adversarial25_report.json'),
  JSON.stringify(results, null, 2)
);

// Summary markdown
const summary = `# Adversarial 25 — Hardening Report

**Date**: ${new Date().toISOString()}
**Results**: ${correct}/${PROMPTS.length} correct | ${incorrect} failures | ${borderlineOk} borderline

## Route Decisions

| # | Score | Route | Expected | Archetype | Category | Correct |
|---|-------|-------|----------|-----------|----------|---------|
${results.map(r => `| ${r.id} | ${r.fitnessScore} | ${r.actualRecommendation} | ${r.expectedRoute} | ${r.detectedArchetype || '-'} | ${r.category} | ${r.correct ? '✅' : '❌'} |`).join('\n')}

## Failures
${results.filter(r => !r.correct).map(r => `- **#${r.id}** (${r.category}): Score ${r.fitnessScore} → ${r.actualRecommendation}, expected ${r.expectedRoute}. ${r.notes}`).join('\n') || 'None'}

## Borderline Cases
${results.filter(r => r.expectedRoute === 'borderline').map(r => `- **#${r.id}** (${r.category}): Score ${r.fitnessScore} → ${r.actualRecommendation}. ${r.notes}`).join('\n')}
`;

fs.writeFileSync(
  path.join(reportsDir, 'adversarial25_summary.md'),
  summary
);

console.log('\n📄 Reports written to reports/adversarial25_report.json and reports/adversarial25_summary.md');

process.exit(incorrect > 0 ? 1 : 0);
