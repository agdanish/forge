/**
 * Shell Fitness Gate — decides whether a prompt can be well-served by
 * deterministic shells, or should escape to full LLM code generation.
 *
 * Returns a fitness score 0-100 and a recommendation: 'shell' | 'llm'.
 *
 * The key insight: shells are GREAT for management tools, dashboards,
 * landing pages, workflows, and guided forms. But they're BAD for:
 *   - chat apps, messaging, real-time collaboration
 *   - games, interactive visualizations, animations
 *   - e-commerce with cart/checkout
 *   - social media / feed-based UIs
 *   - map-based / geolocation apps
 *   - file editors, code editors, document tools
 *   - music/media players
 *   - specific API integrations (weather, stocks, etc.)
 *
 * When a prompt clearly needs one of those, shell output will look wrong
 * and score poorly on Functionality. Better to spend 20-30s on LLM generation
 * than submit a mismatched shell in 2s.
 */

import { logger } from '../utils/logger.js';

export interface FitnessResult {
  score: number;           // 0-100, higher = better shell fit
  recommendation: 'shell' | 'llm';
  reason: string;
  matchedShellKeywords: number;
  matchedEscapeKeywords: number;
}

// ── Keywords that STRONGLY indicate a shell will work well ──────────────
const SHELL_POSITIVE_KEYWORDS = [
  // Universal shell
  'manage', 'manager', 'tracker', 'tracking', 'crud', 'list', 'catalog',
  'inventory', 'directory', 'registry', 'crm', 'contact', 'booking',
  'scheduling', 'appointment', 'reservation', 'log', 'journal',
  // Dashboard shell
  'dashboard', 'analytics', 'metrics', 'kpi', 'reporting', 'overview',
  'monitor', 'statistics', 'insights',
  // Landing shell
  'landing page', 'homepage', 'showcase', 'portfolio', 'product page',
  'coming soon', 'waitlist', 'marketing',
  // Kanban shell
  'kanban', 'board', 'pipeline', 'workflow', 'stages', 'sprint',
  'backlog', 'triage', 'escalation',
  // Wizard shell
  'wizard', 'onboarding', 'intake', 'questionnaire', 'assessment',
  'eligibility', 'step-by-step', 'guided', 'registration flow',
  'setup flow', 'configure',
  // Generic management patterns
  'admin panel', 'back office', 'tool for', 'system for', 'platform for',
  'app for managing', 'app for tracking', 'planner', 'organizer',
  'task', 'project', 'ticket', 'issue', 'expense', 'invoice',
  'patient', 'student', 'employee', 'volunteer', 'donor', 'member',
  'course', 'event', 'order', 'product', 'property', 'recipe',
  'workout', 'habit', 'goal', 'budget',
];

// ── Keywords that indicate a shell will NOT serve the prompt well ────────
// These prompts need custom UI that shells can't provide.
const ESCAPE_KEYWORDS = [
  // Chat / messaging
  'chat', 'messaging', 'messenger', 'real-time', 'realtime', 'socket',
  'conversation', 'dm', 'direct message', 'slack', 'discord',
  // Games / interactive
  'game', 'quiz game', 'trivia', 'arcade', 'puzzle', 'platformer',
  'tic-tac-toe', 'chess', 'snake', 'tetris', 'wordle', 'hangman',
  'simulation', 'virtual', 'interactive story',
  // E-commerce with cart
  'shopping cart', 'checkout', 'add to cart', 'ecommerce store',
  'online store', 'marketplace', 'buy', 'purchase',
  // Social / feed
  'social media', 'social network', 'feed', 'timeline', 'news feed',
  'twitter clone', 'instagram clone', 'reddit clone', 'forum',
  'post', 'comment', 'like', 'follow', 'profile page',
  // Map / geo
  'map', 'geolocation', 'location-based', 'gps', 'route planner',
  'store locator', 'nearby',
  // Editors
  'code editor', 'text editor', 'markdown editor', 'rich text',
  'wysiwyg', 'drawing', 'paint', 'canvas', 'whiteboard',
  'spreadsheet', 'diagram',
  // Media players
  'music player', 'video player', 'audio', 'podcast player',
  'playlist', 'media player', 'spotify',
  // Specific integrations
  'weather app', 'stock ticker', 'stock trading', 'crypto',
  'exchange rate', 'api integration', 'live data',
  // Calculator / converter
  'calculator', 'converter', 'unit converter', 'currency converter',
  // File / upload
  'file upload', 'file manager', 'cloud storage', 'dropbox',
  'image gallery', 'photo album',
  // Authentication
  'login', 'signup', 'auth', 'authentication', 'password',
  'oauth', 'jwt',
  // Notification / email
  'email client', 'inbox', 'notification center',
];

// ── Compound patterns: multi-word combos that strongly signal escape ─────
const ESCAPE_PATTERNS: RegExp[] = [
  /\bchat\s+app\b/i,
  /\bmessaging\s+(?:app|platform|tool)\b/i,
  /\bgame\b/i,
  /\bonline\s+store\b/i,
  /\bshopping\s+cart\b/i,
  /\bsocial\s+(?:media|network)\b/i,
  /\bnews\s+feed\b/i,
  /\bcode\s+editor\b/i,
  /\btext\s+editor\b/i,
  /\bmusic\s+player\b/i,
  /\bvideo\s+player\b/i,
  /\bweather\s+app\b/i,
  /\bstock\s+(?:ticker|trading|tracker)\b/i,
  /\bfile\s+(?:manager|upload)\b/i,
  /\bimage\s+gallery\b/i,
  /\bphoto\s+(?:album|gallery|sharing)\b/i,
  /\bemail\s+client\b/i,
  /\bcrypto\s+(?:wallet|exchange|trading)\b/i,
  /\bclone\b/i,     // "twitter clone", "uber clone" etc. — always custom
  /\blike\s+(?:uber|airbnb|spotify|netflix|tinder)\b/i,
  /\bwhiteboard\b/i,
];

// ── Shell-positive patterns ─────────────────────────────────────────────
const SHELL_PATTERNS: RegExp[] = [
  /\b(?:build|create|make)\s+(?:a\s+)?(?:.*?\s+)?(?:manager|tracker|dashboard|tool|system|platform)\b/i,
  /\b(?:build|create|make)\s+(?:a\s+)?(?:.*?\s+)?(?:kanban|board|pipeline|workflow)\b/i,
  /\b(?:build|create|make)\s+(?:a\s+)?(?:.*?\s+)?(?:wizard|intake|onboarding|assessment)\b/i,
  /\b(?:build|create|make)\s+(?:a\s+)?(?:.*?\s+)?(?:landing|homepage|showcase)\b/i,
  /\b(?:manage|track|organize|plan|schedule|monitor)\b/i,
  /\badmin\s+(?:panel|dashboard|tool)\b/i,
];

const SHELL_THRESHOLD = 50;  // Below this → escape to LLM

/**
 * Score how well a prompt fits the deterministic shell architecture.
 * Returns score (0-100) and recommendation ('shell' or 'llm').
 */
export function checkShellFitness(prompt: string): FitnessResult {
  const lower = prompt.toLowerCase();
  let score = 50; // Start neutral
  let matchedShellKeywords = 0;
  let matchedEscapeKeywords = 0;
  const reasons: string[] = [];

  // ── Count shell-positive keyword matches ──
  for (const kw of SHELL_POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) {
      matchedShellKeywords++;
      score += 8;
    }
  }

  // ── Count escape keyword matches ──
  for (const kw of ESCAPE_KEYWORDS) {
    if (lower.includes(kw)) {
      matchedEscapeKeywords++;
      score -= 15;
    }
  }

  // ── Check compound escape patterns (strong negative signal) ──
  for (const pattern of ESCAPE_PATTERNS) {
    if (pattern.test(prompt)) {
      matchedEscapeKeywords++;
      score -= 25;
      reasons.push(`escape pattern: ${pattern.source}`);
    }
  }

  // ── Check shell-positive patterns ──
  for (const pattern of SHELL_PATTERNS) {
    if (pattern.test(prompt)) {
      matchedShellKeywords++;
      score += 10;
    }
  }

  // ── Very short/vague prompts: shells are safer than LLM guessing ──
  const wordCount = prompt.trim().split(/\s+/).length;
  if (wordCount <= 5) {
    score += 15;
    reasons.push('short prompt — shell safer');
  }

  // ── If prompt explicitly says "app" or "tool" + entity → shell is fine ──
  if (/\b(?:app|tool|system|platform)\s+(?:for|to)\b/i.test(prompt)) {
    score += 12;
    reasons.push('generic app/tool pattern');
  }

  // ── Clamp score ──
  score = Math.max(0, Math.min(100, score));

  const recommendation: 'shell' | 'llm' = score >= SHELL_THRESHOLD ? 'shell' : 'llm';

  const reason = reasons.length > 0
    ? reasons.join('; ')
    : recommendation === 'shell'
    ? `${matchedShellKeywords} shell keywords, ${matchedEscapeKeywords} escape keywords`
    : `Low fitness: ${matchedEscapeKeywords} escape keywords outweigh ${matchedShellKeywords} shell keywords`;

  logger.info(`[FITNESS] Score: ${score}/100 → ${recommendation.toUpperCase()} | Shell KW: ${matchedShellKeywords} | Escape KW: ${matchedEscapeKeywords} | ${reason}`);

  return {
    score,
    recommendation,
    reason,
    matchedShellKeywords,
    matchedEscapeKeywords,
  };
}
