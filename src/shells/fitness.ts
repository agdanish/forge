/**
 * Shell Fitness Gate v2 — decides whether a prompt can be well-served by
 * deterministic shells, or should escape to full LLM code generation.
 *
 * Three-layer scoring system:
 *   Layer 1: Archetype detection (14 known prompt archetypes from scaffold hints)
 *   Layer 2: Semantic signal analysis (verb patterns, entity patterns, UI patterns)
 *   Layer 3: Keyword scoring (shell-positive vs escape keywords)
 *
 * Returns a fitness score 0-100 and recommendation: 'shell' | 'llm'.
 *
 * SHELLS HANDLE (5 shells):
 *   universal  → CRUD tools, trackers, managers, CRM, schedulers
 *   dashboard  → analytics, KPIs, reporting, metrics, monitoring
 *   landing    → landing pages, showcases, portfolios, marketing
 *   kanban     → pipeline boards, workflows, sprint boards, triage
 *   wizard     → onboarding, intake, assessment, guided setup
 *
 * LLM HANDLES (everything else):
 *   chat/messaging, games, e-commerce with cart, social feeds,
 *   editors, media players, calendar grids, maps, calculators, etc.
 *
 * Research-backed: archetypes from templates/index.ts (14 types),
 * hackathon research (evaluation_model.md, competitor_landscape.md).
 */

import { logger } from '../utils/logger.js';

export interface FitnessResult {
  score: number;           // 0-100, higher = better shell fit
  recommendation: 'shell' | 'llm';
  reason: string;
  matchedShellKeywords: number;
  matchedEscapeKeywords: number;
  detectedArchetype: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 1: ARCHETYPE DETECTION
// Maps the 14 known archetypes to shell capability.
// An archetype match is a STRONG signal — overrides keyword scoring.
// ══════════════════════════════════════════════════════════════════════════════

interface Archetype {
  id: string;
  keywords: string[];
  patterns: RegExp[];
  shellCapable: boolean;   // Can a shell handle this archetype?
  confidence: number;      // How much to boost/penalize score (absolute)
}

const ARCHETYPES: Archetype[] = [
  // ── SHELL-CAPABLE ARCHETYPES ──
  {
    id: 'saas-dashboard',
    keywords: ['dashboard', 'admin', 'saas', 'crm', 'management', 'panel', 'monitor', 'overview', 'control'],
    patterns: [/\b(?:admin|management)\s+(?:panel|dashboard)\b/i, /\b(?:crm|erp)\b/i],
    shellCapable: true,
    confidence: 85,
  },
  {
    id: 'analytics',
    keywords: ['analytics', 'chart', 'graph', 'report', 'reporting', 'data', 'visualization', 'insight', 'statistic', 'metric', 'metrics', 'bi'],
    patterns: [/\b(?:analytics|reporting)\s+(?:dashboard|tool|platform|panel)\b/i, /\bdata\s+vis/i, /\bmetrics?\s+(?:reporting|panel|dashboard)\b/i],
    shellCapable: true,
    confidence: 85,
  },
  {
    id: 'crud-tool',
    keywords: ['crud', 'manage', 'form', 'task', 'todo', 'note', 'item', 'list', 'record', 'entry', 'tracker'],
    patterns: [/\b(?:task|note|item|record)\s+(?:manager|tracker|list)\b/i, /\bto-?do\b/i],
    shellCapable: true,
    confidence: 90,
  },
  {
    id: 'productivity-kanban',
    keywords: ['kanban', 'board', 'workflow', 'sprint', 'agile', 'scrum', 'backlog', 'column', 'swim', 'pipeline'],
    patterns: [/\bkanban\b/i, /\b(?:sprint|scrum)\s+board\b/i, /\bworkflow\s+(?:board|tool)\b/i],
    shellCapable: true,
    confidence: 85,
  },
  {
    id: 'portfolio-showcase',
    keywords: ['portfolio', 'showcase', 'gallery', 'resume', 'cv', 'personal', 'website', 'landing', 'agency'],
    patterns: [/\b(?:landing|portfolio)\s+page\b/i, /\bpersonal\s+(?:website|site)\b/i],
    shellCapable: true,
    confidence: 80,
  },
  {
    id: 'finance',
    keywords: ['budget', 'expense', 'finance', 'money', 'invoice', 'billing', 'payment', 'cost', 'salary', 'income', 'spend', 'accounting', 'transaction'],
    patterns: [/\b(?:budget|expense|finance)\s+(?:tracker|manager|tool)\b/i, /\binvoice\b/i],
    shellCapable: true,
    confidence: 80,
  },
  {
    id: 'health-fitness',
    keywords: ['health', 'fitness', 'workout', 'exercise', 'nutrition', 'diet', 'calories', 'wellness', 'gym', 'training', 'habit'],
    patterns: [/\b(?:fitness|workout|health)\s+(?:tracker|app|tool)\b/i, /\bhabit\s+tracker\b/i],
    shellCapable: true,
    confidence: 75,
  },
  {
    id: 'education-platform',
    keywords: ['education', 'learning', 'course', 'study', 'school', 'teach', 'lesson', 'curriculum', 'student', 'enrollment'],
    patterns: [/\b(?:course|learning)\s+(?:platform|management|tracker)\b/i, /\bstudent\s+(?:portal|dashboard)\b/i],
    shellCapable: true,
    confidence: 75,
  },
  {
    id: 'wizard-intake',
    keywords: ['wizard', 'onboarding', 'intake', 'questionnaire', 'assessment', 'eligibility', 'guided', 'step-by-step', 'configure'],
    patterns: [/\b(?:onboarding|intake|setup)\s+(?:wizard|flow|form)\b/i, /\bstep-by-step\b/i, /\beligibility\s+(?:check|assess)/i],
    shellCapable: true,
    confidence: 85,
  },
  {
    id: 'real-estate',
    keywords: ['real estate', 'property', 'house', 'apartment', 'rent', 'mortgage', 'listing', 'realty', 'flat'],
    patterns: [/\breal\s+estate\b/i, /\bproperty\s+(?:listing|manager|search)\b/i],
    shellCapable: true,  // Universal shell handles property listings well
    confidence: 70,
  },

  // ── LLM-REQUIRED ARCHETYPES ──
  {
    id: 'ai-chat',
    keywords: ['chat', 'conversation', 'message', 'assistant', 'bot', 'gpt', 'llm', 'copilot'],
    patterns: [/\bchat\s+(?:app|bot|interface|ui)\b/i, /\b(?:ai|gpt)\s+(?:chat|assistant)\b/i, /\bmessaging\b/i],
    shellCapable: false,
    confidence: 90,
  },
  {
    id: 'ecommerce',
    keywords: ['shop', 'store', 'cart', 'buy', 'sell', 'marketplace', 'ecommerce', 'commerce', 'checkout'],
    patterns: [/\b(?:shopping|online)\s+(?:cart|store)\b/i, /\bcheckout\b/i, /\bmarketplace\b/i, /\be-?commerce\b/i],
    shellCapable: false,
    confidence: 85,
  },
  {
    id: 'social-feed',
    keywords: ['social', 'community', 'feed', 'post', 'follow', 'friend', 'network', 'tweet', 'share', 'like', 'comment'],
    patterns: [/\bsocial\s+(?:media|network|feed)\b/i, /\b(?:twitter|instagram|reddit|facebook)\s*clone\b/i, /\bnews\s+feed\b/i],
    shellCapable: false,
    confidence: 85,
  },
  {
    id: 'game-quiz',
    keywords: ['game', 'quiz', 'trivia', 'puzzle', 'score', 'leaderboard', 'challenge', 'play', 'level', 'word', 'memory'],
    patterns: [/\bgame\b/i, /\b(?:quiz|trivia)\s+(?:app|game)\b/i, /\b(?:tetris|snake|wordle|chess|tic-?tac-?toe)\b/i],
    shellCapable: false,
    confidence: 90,
  },
  {
    id: 'calendar-events',
    keywords: ['calendar', 'monthly view', 'week view', 'day view', 'agenda view'],
    patterns: [/\bcalendar\s+(?:app|grid|view)\b/i, /\bmonthly?\s+(?:calendar|view)\b/i, /\bcalendar\s+with\b/i],
    shellCapable: false,  // Calendar grid needs custom UI — shells don't have it
    confidence: 70,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 2: SEMANTIC SIGNALS
// Structural patterns in prompt that indicate shell fit or misfit.
// ══════════════════════════════════════════════════════════════════════════════

// Verb patterns that indicate management/tracking → shell-friendly
const MANAGEMENT_VERBS = /\b(?:manage|track|organize|plan|schedule|monitor|log|record|administer|oversee|coordinate|assign|prioritize|categorize|filter|sort|group|archive)\b/i;

// Verb patterns that indicate interactive/dynamic UI → LLM-needed
const INTERACTIVE_VERBS = /\b(?:play|stream|draw|paint|drag|drop|animate|scroll|swipe|type|compose|edit|render|compile|upload|download|connect|sync|subscribe)\b/i;

// Entity patterns indicating data management → shell-friendly
const DATA_ENTITY_PATTERN = /\b(?:tasks?|projects?|tickets?|issues?|patients?|students?|employees?|contacts?|orders?|invoices?|records?|items?|products?|members?|clients?|leads?|cases?|assets?|events?|bookings?|appointments?|expenses?|donations?|volunteers?|shipments?|courses?|properties?|campaigns?|applications?|submissions?)\b/i;

// UI-specific patterns indicating non-shell needs
const CUSTOM_UI_PATTERNS = [
  /\b(?:drag\s+and\s+drop|drag-and-drop|draggable)\b/i,
  /\b(?:real-?time|live\s+(?:data|update|stream|preview))\b/i,
  /\b(?:animation|animate|transition|parallax|3d|three\.?js)\b/i,
  /\b(?:responsive\s+(?:email|newsletter))\b/i,
  /\b(?:dark\s+mode\s+toggle|theme\s+switch)\b/i,
  /\b(?:infinite\s+scroll|lazy\s+load|pagination)\b/i,
  /\b(?:notification|toast|snackbar)\s+system\b/i,
  /\b(?:file\s+upload|image\s+crop|pdf\s+viewer)\b/i,
];

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 3: ESCAPE KEYWORDS (hard signals that shells can't serve)
// ══════════════════════════════════════════════════════════════════════════════

const HARD_ESCAPE_PATTERNS: RegExp[] = [
  // Chat / messaging — STRONG escape
  /\bchat\s+(?:app|application|interface|room|bot)\b/i,
  /\bmessaging\s+(?:app|platform|tool|system)\b/i,
  /\bslack[\s-]like\b/i,
  /\bdiscord[\s-]like\b/i,
  // Games — STRONG escape
  /\bgame\b/i,
  /\b(?:tetris|snake|wordle|chess|tic-?tac-?toe|hangman|sudoku|minesweeper|pong|breakout|flappy)\b/i,
  // E-commerce — STRONG escape
  /\b(?:shopping\s+cart|add\s+to\s+cart|checkout\s+(?:flow|page|process))\b/i,
  /\b(?:online|e-?commerce)\s+store\b/i,
  // Social — STRONG escape
  /\bsocial\s+(?:media|network|feed|platform)\b/i,
  /\b(?:twitter|instagram|reddit|facebook|tiktok|youtube)\s*(?:clone|like|style)\b/i,
  /\bnews\s+feed\b/i,
  // Editors — STRONG escape
  /\b(?:code|text|markdown|rich[\s-]text|wysiwyg)\s+editor\b/i,
  /\bwhiteboard\b/i,
  /\bdrawing\s+(?:app|canvas|tool)\b/i,
  // Media — STRONG escape
  /\b(?:music|video|audio|media)\s+player\b/i,
  /\bspotify[\s-](?:like|clone|style)\b/i,
  /\bnetflix[\s-](?:like|clone|style)\b/i,
  // Clone pattern — ALWAYS escape
  /\bclone\b/i,
  /\blike\s+(?:uber|airbnb|spotify|netflix|tinder|whatsapp|telegram)\b/i,
  /\b(?:uber|airbnb|spotify|netflix|tinder|whatsapp|telegram)[\s-](?:like|style|clone|inspired)\b/i,
  // Calendar grid — escape (shells don't have month grid)
  /\bmonthly?\s+calendar\b/i,
  /\bcalendar\s+grid\b/i,
  // Weather / live data — escape
  /\bweather\s+(?:app|dashboard|forecast)\b/i,
  /\bstock\s+(?:ticker|trading|market)\b/i,
  /\bcrypto\s+(?:wallet|exchange|trading|tracker)\b/i,
  // File / image specific
  /\bfile\s+(?:manager|explorer|browser)\b/i,
  /\bimage\s+gallery\b/i,
  /\bphoto\s+(?:album|gallery|sharing|editor)\b/i,
  // Email
  /\bemail\s+(?:client|inbox)\b/i,
];

// ══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

const THRESHOLD = 50;

export function checkShellFitness(prompt: string): FitnessResult {
  const lower = prompt.toLowerCase();
  const wordCount = prompt.trim().split(/\s+/).length;
  let score = 50; // Neutral starting point
  let matchedShellKeywords = 0;
  let matchedEscapeKeywords = 0;
  let detectedArchetype: string | null = null;
  const reasons: string[] = [];

  // ════════════════════════════════════════════════════
  // LAYER 1: Archetype detection (strongest signal)
  // ════════════════════════════════════════════════════
  let bestArchetype: Archetype | null = null;
  let bestArchetypeScore = 0;

  for (const arch of ARCHETYPES) {
    let archScore = 0;
    // Keyword matches
    for (const kw of arch.keywords) {
      if (lower.includes(kw)) archScore += 2;
    }
    // Pattern matches (stronger signal)
    for (const pat of arch.patterns) {
      if (pat.test(prompt)) archScore += 5;
    }
    if (archScore > bestArchetypeScore) {
      bestArchetypeScore = archScore;
      bestArchetype = arch;
    }
  }

  if (bestArchetype && bestArchetypeScore >= 4) {
    detectedArchetype = bestArchetype.id;

    // ── Archetype conflict resolution ──
    // If an LLM-required archetype matches but the prompt ALSO has strong
    // shell-capable archetype signals, check for dual matches.
    // Example: "metrics reporting panel for e-commerce" → ecommerce archetype,
    // but "reporting panel" is clearly a dashboard/analytics use case.
    if (!bestArchetype.shellCapable) {
      // Check if a shell-capable archetype also has a reasonable match
      let bestShellArch: Archetype | null = null;
      let bestShellScore = 0;
      for (const arch of ARCHETYPES) {
        if (!arch.shellCapable) continue;
        let s = 0;
        for (const kw of arch.keywords) { if (lower.includes(kw)) s += 2; }
        for (const pat of arch.patterns) { if (pat.test(prompt)) s += 5; }
        if (s > bestShellScore) { bestShellScore = s; bestShellArch = arch; }
      }
      // If shell archetype has comparable score → prefer shell (it's the safer bet)
      if (bestShellArch && bestShellScore >= bestArchetypeScore * 0.6) {
        detectedArchetype = bestShellArch.id;
        score = bestShellArch.confidence;
        matchedShellKeywords += bestShellScore;
        reasons.push(`archetype conflict: ${bestArchetype.id} vs ${bestShellArch.id} → shell wins (${bestShellScore} vs ${bestArchetypeScore})`);
      } else {
        score = 100 - bestArchetype.confidence;
        matchedEscapeKeywords += bestArchetypeScore;
        reasons.push(`archetype: ${bestArchetype.id} (LLM-required, confidence: ${bestArchetype.confidence})`);
      }
    } else {
      score = bestArchetype.confidence;
      matchedShellKeywords += bestArchetypeScore;
      reasons.push(`archetype: ${bestArchetype.id} (shell-capable, confidence: ${bestArchetype.confidence})`);
    }
  }

  // ════════════════════════════════════════════════════
  // LAYER 2: Semantic signals (modifier — adjusts score)
  // ════════════════════════════════════════════════════

  // Management verbs → shell friendly
  const mgmtMatch = prompt.match(new RegExp(MANAGEMENT_VERBS.source, 'gi'));
  if (mgmtMatch) {
    const count = mgmtMatch.length;
    score += Math.min(count * 5, 15);
    matchedShellKeywords += count;
    if (count >= 2) reasons.push(`${count} management verbs`);
  }

  // Interactive verbs → LLM likely needed
  const interactMatch = prompt.match(new RegExp(INTERACTIVE_VERBS.source, 'gi'));
  if (interactMatch) {
    const count = interactMatch.length;
    score -= Math.min(count * 5, 15);
    matchedEscapeKeywords += count;
    if (count >= 2) reasons.push(`${count} interactive verbs`);
  }

  // Data entity mentions → strong shell signal
  const entityMatch = prompt.match(new RegExp(DATA_ENTITY_PATTERN.source, 'gi'));
  if (entityMatch) {
    const uniqueEntities = new Set(entityMatch.map(e => e.toLowerCase()));
    score += Math.min(uniqueEntities.size * 4, 12);
    matchedShellKeywords += uniqueEntities.size;
    if (uniqueEntities.size >= 2) reasons.push(`${uniqueEntities.size} data entities`);
  }

  // Custom UI patterns → moderate escape signal
  for (const pat of CUSTOM_UI_PATTERNS) {
    if (pat.test(prompt)) {
      score -= 8;
      matchedEscapeKeywords++;
    }
  }

  // ════════════════════════════════════════════════════
  // LAYER 3: Hard escape patterns (override — can force LLM)
  // ════════════════════════════════════════════════════

  let hardEscapeCount = 0;
  for (const pattern of HARD_ESCAPE_PATTERNS) {
    if (pattern.test(prompt)) {
      hardEscapeCount++;
      score -= 20;
      if (hardEscapeCount <= 3) reasons.push(`hard escape: ${pattern.source.substring(0, 30)}`);
    }
  }
  matchedEscapeKeywords += hardEscapeCount;

  // ════════════════════════════════════════════════════
  // CONTEXTUAL ADJUSTMENTS
  // ════════════════════════════════════════════════════

  // Very short prompts (≤5 words): shells are safer — LLM might hallucinate complexity
  if (wordCount <= 5) {
    score += 10;
    reasons.push('short prompt — shell safer');
  }

  // Very long prompts (>50 words): might describe complex custom app — slight LLM lean
  if (wordCount > 50) {
    score -= 5;
  }

  // "app/tool/system for X" pattern → management tool → shell-friendly
  if (/\b(?:app|tool|system|platform)\s+(?:for|to)\b/i.test(prompt)) {
    score += 8;
    matchedShellKeywords++;
    reasons.push('generic app/tool pattern');
  }

  // "build/create/make" + shell-specific noun
  if (/\b(?:build|create|make)\s+(?:a\s+)?(?:\w+\s+){0,3}(?:dashboard|tracker|manager|planner|organizer|directory|registry|portal|scheduler)\b/i.test(prompt)) {
    score += 10;
    matchedShellKeywords++;
    reasons.push('explicit shell-noun pattern');
  }

  // Conflict resolution: if both shell and escape signals are strong,
  // the escape signals should win (better to be safe with LLM)
  if (matchedShellKeywords > 0 && matchedEscapeKeywords > 0) {
    if (hardEscapeCount >= 2) {
      // Multiple hard escapes = definitely not a shell job
      score = Math.min(score, 30);
      reasons.push('multiple hard escapes override shell signals');
    }
  }

  // ════════════════════════════════════════════════════
  // FINAL DECISION
  // ════════════════════════════════════════════════════

  score = Math.max(0, Math.min(100, score));

  const recommendation: 'shell' | 'llm' = score >= THRESHOLD ? 'shell' : 'llm';

  const reason = reasons.length > 0
    ? reasons.join('; ')
    : recommendation === 'shell'
    ? `${matchedShellKeywords} shell signals, ${matchedEscapeKeywords} escape signals`
    : `Low fitness: ${matchedEscapeKeywords} escape signals outweigh ${matchedShellKeywords} shell signals`;

  logger.info(`[FITNESS] Score: ${score}/100 → ${recommendation.toUpperCase()} | Archetype: ${detectedArchetype || 'none'} | Shell: ${matchedShellKeywords} | Escape: ${matchedEscapeKeywords} | ${reason}`);

  return {
    score,
    recommendation,
    reason,
    matchedShellKeywords,
    matchedEscapeKeywords,
    detectedArchetype,
  };
}
