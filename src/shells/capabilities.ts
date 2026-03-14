/**
 * Capability Validation Layer — principled shell routing based on
 * required UI capabilities, not just archetype keywords.
 *
 * Three components:
 *   1. Capability Taxonomy — what UI capabilities exist
 *   2. Shell Profiles — what each shell can/cannot do
 *   3. Capability Extractor — infer required capabilities from prompt
 *   4. Compatibility Scorer — can a shell serve this prompt honestly?
 *
 * No LLM calls. Fully deterministic. Offline-safe.
 */

// ══════════════════════════════════════════════════════════════════════════════
// CAPABILITY TAXONOMY
// ══════════════════════════════════════════════════════════════════════════════

export type Capability =
  // Data / Structure
  | 'record_list'
  | 'searchable_records'
  | 'filterable_records'
  | 'detail_panel'
  | 'crud_operations'
  | 'grouped_records'
  | 'comparison_view'
  | 'kpi_summary'
  | 'chart_analytics'
  | 'timeline_activity'
  // Workflow / Process
  | 'stage_progression'
  | 'pipeline_board'
  | 'task_flow'
  | 'multi_step_progress'
  | 'intake_flow'
  | 'recommendation_result'
  | 'setup_flow'
  // Landing / Marketing
  | 'hero_section'
  | 'feature_grid'
  | 'pricing_block'
  | 'faq_section'
  | 'testimonials'
  | 'cta_sections'
  // High-Risk / Custom (shells CANNOT do these)
  | 'realtime_presence'
  | 'chat_threads'
  | 'feed_interactions'
  | 'cart_checkout'
  | 'media_playback'
  | 'chapter_timeline'
  | 'freeform_canvas'
  | 'draggable_canvas'
  | 'diagram_connections'
  | 'rich_text_editing'
  | 'map_first_ui'
  | 'route_planning'
  | 'geospatial_markers'
  | 'drawing_tools'
  | 'game_loop'
  | 'clone_pattern'
  // Borderline
  | 'split_view_map_list'
  | 'booking_flow'
  | 'calendar_grid'
  | 'conversation_inbox'
  | 'nested_discussion'
  | 'live_activity_stream';

type SupportLevel = 'strong' | 'acceptable' | 'unsupported';

// ══════════════════════════════════════════════════════════════════════════════
// SHELL CAPABILITY PROFILES
// ══════════════════════════════════════════════════════════════════════════════

type ShellId = 'universal' | 'dashboard' | 'landing' | 'kanban' | 'wizard';

const SHELL_PROFILES: Record<ShellId, Partial<Record<Capability, SupportLevel>>> = {
  universal: {
    record_list: 'strong',
    searchable_records: 'strong',
    filterable_records: 'strong',
    detail_panel: 'strong',
    crud_operations: 'strong',
    grouped_records: 'strong',
    kpi_summary: 'acceptable',
    timeline_activity: 'acceptable',
    comparison_view: 'acceptable',
    // Not supported (implicit unsupported for everything else)
  },
  dashboard: {
    kpi_summary: 'strong',
    chart_analytics: 'strong',
    filterable_records: 'strong',
    timeline_activity: 'strong',
    detail_panel: 'acceptable',
    grouped_records: 'acceptable',
    record_list: 'acceptable',
    searchable_records: 'acceptable',
  },
  landing: {
    hero_section: 'strong',
    feature_grid: 'strong',
    pricing_block: 'strong',
    faq_section: 'strong',
    testimonials: 'strong',
    cta_sections: 'strong',
  },
  kanban: {
    pipeline_board: 'strong',
    stage_progression: 'strong',
    task_flow: 'strong',
    searchable_records: 'acceptable',
    detail_panel: 'acceptable',
    grouped_records: 'acceptable',
    filterable_records: 'acceptable',
  },
  wizard: {
    multi_step_progress: 'strong',
    intake_flow: 'strong',
    recommendation_result: 'strong',
    setup_flow: 'strong',
    kpi_summary: 'acceptable',
    detail_panel: 'acceptable',
  },
};

// Capabilities that are INCOMPATIBLE with ALL shells — if present, must escape to LLM
const SHELL_INCOMPATIBLE: Set<Capability> = new Set([
  'realtime_presence',
  'chat_threads',
  'feed_interactions',
  'cart_checkout',
  'media_playback',
  'chapter_timeline',
  'freeform_canvas',
  'draggable_canvas',
  'diagram_connections',
  'rich_text_editing',
  'map_first_ui',
  'route_planning',
  'geospatial_markers',
  'drawing_tools',
  'game_loop',
  'clone_pattern',
  'split_view_map_list',
  'booking_flow',
  'calendar_grid',
  'nested_discussion',
]);

// Capabilities that are borderline — not auto-veto but reduce confidence
const SHELL_BORDERLINE: Set<Capability> = new Set([
  'conversation_inbox',
  'live_activity_stream',
  'comparison_view',
]);

// ══════════════════════════════════════════════════════════════════════════════
// CAPABILITY EXTRACTOR
// Deterministic pattern matching — no LLM calls
// ══════════════════════════════════════════════════════════════════════════════

interface CapabilityPattern {
  capability: Capability;
  patterns: RegExp[];
  keywords: string[];
}

const CAPABILITY_PATTERNS: CapabilityPattern[] = [
  // ── Data / Structure ──
  {
    capability: 'record_list',
    patterns: [/\b(?:list|table|grid)\s+(?:of|view|display)\b/i],
    keywords: ['list', 'table', 'records', 'entries', 'directory', 'catalog', 'inventory', 'registry'],
  },
  {
    capability: 'searchable_records',
    patterns: [/\b(?:search|find|lookup)\b/i],
    keywords: ['search', 'search bar', 'find', 'lookup', 'query'],
  },
  {
    capability: 'filterable_records',
    patterns: [/\b(?:filter|sort|category\s+filter)\b/i],
    keywords: ['filter', 'filters', 'sort', 'sorting', 'category filter', 'price filter'],
  },
  {
    capability: 'detail_panel',
    patterns: [/\b(?:detail|details)\s+(?:panel|page|view|modal|drawer|sidebar)\b/i],
    keywords: ['detail panel', 'detail page', 'detail view', 'detail modal', 'properties panel'],
  },
  {
    capability: 'crud_operations',
    patterns: [/\b(?:create|add|edit|delete|update|remove)\b/i, /\bcrud\b/i],
    keywords: ['create', 'add new', 'edit', 'delete', 'update', 'remove', 'crud', 'manage'],
  },
  {
    capability: 'grouped_records',
    patterns: [/\b(?:group|cluster|categorize|segment)\b/i],
    keywords: ['grouped', 'clusters', 'categories', 'segments', 'sections'],
  },
  {
    capability: 'comparison_view',
    patterns: [/\b(?:compare|comparison|side[\s-]by[\s-]side)\b/i],
    keywords: ['compare', 'comparison', 'side-by-side', 'comparison panel', 'comparison tray'],
  },
  {
    capability: 'kpi_summary',
    patterns: [/\b(?:kpi|metric|stat)\s+(?:card|summary|overview)\b/i],
    keywords: ['kpi', 'metrics', 'statistics', 'summary cards', 'overview stats', 'key numbers'],
  },
  {
    capability: 'chart_analytics',
    patterns: [/\b(?:chart|graph|analytics|visualization|spending\s+chart)\b/i],
    keywords: ['chart', 'graph', 'analytics', 'visualization', 'bar chart', 'pie chart', 'donut', 'sparkline', 'spending charts'],
  },
  {
    capability: 'timeline_activity',
    patterns: [/\b(?:activity|timeline|history)\s+(?:feed|log|stream|panel)\b/i],
    keywords: ['activity feed', 'timeline', 'history log', 'activity stream', 'recent activity'],
  },

  // ── Workflow / Process ──
  {
    capability: 'stage_progression',
    patterns: [/\b(?:stage|phase|step)\s+(?:progression|transition|movement)\b/i],
    keywords: ['stages', 'phases', 'progression', 'escalation', 'status transition'],
  },
  {
    capability: 'pipeline_board',
    patterns: [/\b(?:pipeline|kanban|board|column)\s+(?:view|board|layout)\b/i],
    keywords: ['pipeline', 'kanban', 'board', 'columns', 'swimlanes', 'backlog', 'sprint board'],
  },
  {
    capability: 'task_flow',
    patterns: [/\b(?:task|ticket|issue)\s+(?:flow|management|tracking)\b/i],
    keywords: ['task flow', 'ticket management', 'issue tracking', 'workflow', 'approval flow'],
  },
  {
    capability: 'multi_step_progress',
    patterns: [/\b(?:step[\s-]by[\s-]step|multi[\s-]step|wizard|stepper)\b/i],
    keywords: ['step-by-step', 'multi-step', 'wizard', 'stepper', 'progress indicator', 'guided'],
  },
  {
    capability: 'intake_flow',
    patterns: [/\b(?:intake|onboarding|registration)\s+(?:form|flow|process)\b/i],
    keywords: ['intake', 'onboarding', 'registration', 'enrollment', 'application form'],
  },
  {
    capability: 'recommendation_result',
    patterns: [/\b(?:recommendation|result|assessment|eligibility)\b/i],
    keywords: ['recommendation', 'result panel', 'assessment', 'eligibility', 'score result'],
  },
  {
    capability: 'setup_flow',
    patterns: [/\b(?:setup|configure|configuration)\s+(?:flow|wizard|tool)\b/i],
    keywords: ['setup flow', 'configure', 'configuration', 'guided setup', 'initial setup'],
  },

  // ── Landing / Marketing ──
  {
    capability: 'hero_section',
    patterns: [/\b(?:hero|banner|headline)\s+(?:section|area|block)\b/i],
    keywords: ['hero', 'banner', 'headline', 'above the fold', 'splash'],
  },
  {
    capability: 'feature_grid',
    patterns: [/\b(?:feature|benefit)\s+(?:grid|list|section|cards)\b/i],
    keywords: ['features', 'feature grid', 'feature cards', 'benefits', 'capabilities section'],
  },
  {
    capability: 'pricing_block',
    patterns: [/\b(?:pricing|plan|tier)\s+(?:table|block|section|comparison)\b/i],
    keywords: ['pricing', 'plans', 'tiers', 'pricing table', 'subscription'],
  },
  {
    capability: 'faq_section',
    patterns: [/\bfaq\b/i, /\bfrequently\s+asked\b/i],
    keywords: ['faq', 'frequently asked', 'questions and answers'],
  },
  {
    capability: 'testimonials',
    patterns: [/\btestimonial/i],
    keywords: ['testimonials', 'reviews', 'customer quotes', 'social proof'],
  },
  {
    capability: 'cta_sections',
    patterns: [/\bcta\b/i, /\bcall[\s-]to[\s-]action\b/i],
    keywords: ['cta', 'call to action', 'sign up', 'get started', 'try free'],
  },

  // ── High-Risk / Custom (shells CANNOT do these) ──
  {
    capability: 'realtime_presence',
    patterns: [/\b(?:real[\s-]?time|live)\s+(?:presence|cursors?|collaboration|updates?|status|room\s+state)\b/i, /\bcursor\s+presence\b/i, /\btyping\s+indicator/i],
    keywords: ['real-time', 'realtime', 'live presence', 'cursor presence', 'typing indicator', 'live room state', 'member presence'],
  },
  {
    capability: 'chat_threads',
    patterns: [/\bchat\b/i, /\b(?:direct\s+)?messages?\b/i, /\bchannels?\b/i, /\bconversation\s+history\b/i],
    keywords: ['chat', 'messages', 'channels', 'direct messages', 'DMs', 'conversation history', 'message thread', 'canned replies'],
  },
  {
    capability: 'feed_interactions',
    patterns: [/\bsocial\s+feed\b/i, /\bnews\s+feed\b/i, /\b(?:upvote|downvote)\b/i, /\bfollow(?:ing|ers)\b/i, /\blike\s+and\s+comment\b/i],
    keywords: ['social feed', 'news feed', 'posts and comments', 'upvotes', 'downvotes', 'following', 'followers', 'trending topics'],
  },
  {
    capability: 'cart_checkout',
    patterns: [/\bcart\b/i, /\bcheckout\b/i, /\badd\s+to\s+cart\b/i, /\bcoupon\b/i],
    keywords: ['cart', 'shopping cart', 'checkout', 'add to cart', 'coupon', 'shipping', 'order total'],
  },
  {
    capability: 'media_playback',
    patterns: [/\b(?:music|video|audio|media)\s+player\b/i, /\bnow[\s-]playing\b/i, /\bplaylist\b/i, /\bqueue\s+panel\b/i],
    keywords: ['music player', 'video player', 'audio player', 'now playing', 'playlist', 'queue', 'progress bar', 'playback'],
  },
  {
    capability: 'chapter_timeline',
    patterns: [/\bchapter\s+(?:timeline|navigation|markers?)\b/i, /\btranscript\s+search\b/i, /\blesson\s+list\b/i],
    keywords: ['chapter timeline', 'transcript search', 'lesson list', 'video chapters', 'course video'],
  },
  {
    capability: 'freeform_canvas',
    patterns: [/\bcanvas\b/i, /\binfinite[\s-](?:feeling\s+)?canvas\b/i, /\bsticky\s+notes?\b/i],
    keywords: ['canvas', 'infinite canvas', 'sticky notes', 'brainstorming canvas', 'idea cards'],
  },
  {
    capability: 'draggable_canvas',
    patterns: [/\b(?:drag|move|resize)\s+(?:and\s+)?(?:drop|move|resize|color)\b/i, /\bdraggable\s+components?\b/i, /\breposition\s+elements?\b/i],
    keywords: ['drag and drop', 'draggable', 'move', 'resize', 'reposition', 'place blocks'],
  },
  {
    capability: 'diagram_connections',
    patterns: [/\bconnect(?:or)?\s+(?:lines?|arrows?|them|nodes?)\b/i, /\bnode\s+(?:types?|colors?)\b/i, /\bdiagram\b/i],
    keywords: ['connector lines', 'arrows', 'nodes', 'diagram', 'node types', 'properties panel'],
  },
  {
    capability: 'rich_text_editing',
    patterns: [/\brich\s+text\b/i, /\bslash[\s-]command\b/i, /\bsuggestion\s+mode\b/i, /\binline\s+comments?\b/i, /\boutline\s+navigation\b/i],
    keywords: ['rich text', 'document editor', 'slash command', 'suggestion mode', 'inline comments', 'outline navigation'],
  },
  {
    capability: 'map_first_ui',
    patterns: [/\bmap\s+(?:markers?|view|pins?|overlay)\b/i, /\bmap[\s/]+list\s+split\b/i],
    keywords: ['map markers', 'map view', 'map/list split', 'map pins', 'map summary'],
  },
  {
    capability: 'route_planning',
    patterns: [/\broute\s+(?:planner|planning|optimization|completion)\b/i, /\bdelivery\s+stops?\b/i, /\breorder\s+(?:them|stops)\b/i],
    keywords: ['route planner', 'delivery stops', 'route planning', 'route completion', 'reorder stops'],
  },
  {
    capability: 'geospatial_markers',
    patterns: [/\b(?:radius|proximity|nearby)\s+filter\b/i, /\bgeolocation\b/i, /\blocation[\s-]based\b/i, /\bpickup\b/i, /\bdropoff\b/i],
    keywords: ['radius filter', 'geolocation', 'location-based', 'nearby', 'pickup', 'dropoff', 'saved places'],
  },
  {
    capability: 'drawing_tools',
    patterns: [/\bfreehand\s+drawing\b/i, /\bdrawing\s+(?:tool|canvas|app)\b/i, /\bpaint\b/i, /\bwireframe?\b/i],
    keywords: ['freehand drawing', 'drawing tools', 'paint', 'wireframe', 'wireframing', 'sketch'],
  },
  {
    capability: 'game_loop',
    patterns: [/\bgame\b/i, /\blevel\s+select\b/i, /\bscore\s+hud\b/i, /\bpause[\s/]resume\b/i, /\bleaderboard\b/i, /\bgame\s+control\b/i],
    keywords: ['game', 'level select', 'score HUD', 'pause/resume', 'leaderboard', 'game controls', 'keyboard controls'],
  },
  {
    capability: 'clone_pattern',
    patterns: [/\bclone\b/i, /\b(?:slack|discord|uber|airbnb|spotify|netflix|reddit|twitter|instagram|tinder|whatsapp)[\s-](?:like|style|inspired|clone)\b/i, /\blike\s+(?:slack|discord|uber|airbnb|spotify|netflix|reddit|twitter|instagram)\b/i],
    keywords: ['clone', 'slack-like', 'discord-inspired', 'uber-like', 'spotify-like'],
  },

  // ── Borderline ──
  {
    capability: 'split_view_map_list',
    patterns: [/\bmap[\s/]+list\s+split\b/i, /\bsplit\s+(?:view|layout)\b/i],
    keywords: ['map/list split', 'split view', 'split layout'],
  },
  {
    capability: 'booking_flow',
    patterns: [/\bbooking\s+(?:summary|flow|process|confirmation)\b/i, /\bguest\s+selector\b/i, /\bdate\s+selection\b/i],
    keywords: ['booking summary', 'booking flow', 'guest selector', 'date selection', 'reservation flow'],
  },
  {
    capability: 'calendar_grid',
    patterns: [/\bmonthly?\s+calendar\b/i, /\bcalendar\s+grid\b/i, /\bweek\s+view\b/i, /\bday\s+view\b/i],
    keywords: ['monthly calendar', 'calendar grid', 'week view', 'day view'],
  },
  {
    capability: 'conversation_inbox',
    patterns: [/\binbox\b/i, /\bconversation\s+(?:list|panel|switch)\b/i, /\bticket\s+(?:assign|tag|resolve)\b/i],
    keywords: ['inbox', 'conversation list', 'switch between conversations', 'assign tickets', 'resolved/escalated'],
  },
  {
    capability: 'nested_discussion',
    patterns: [/\bnested\s+comments?\b/i, /\bthread(?:ed)?\s+(?:comments?|discussion|replies)\b/i, /\bcomment\s+threads?\b/i],
    keywords: ['nested comments', 'threaded discussion', 'comment threads', 'reply threads'],
  },
  {
    capability: 'live_activity_stream',
    patterns: [/\blive\s+(?:activity|event|log)\s+(?:sidebar|stream|feed)\b/i],
    keywords: ['live activity sidebar', 'live event stream', 'real-time log'],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CAPABILITY EXTRACTOR
// ══════════════════════════════════════════════════════════════════════════════

export interface ExtractedCapabilities {
  detected: Capability[];
  incompatible: Capability[];   // Capabilities no shell can handle
  borderline: Capability[];     // Capabilities that reduce confidence
  shellFriendly: Capability[];  // Capabilities shells handle well
}

export function extractCapabilities(prompt: string): ExtractedCapabilities {
  const lower = prompt.toLowerCase();
  const detected: Set<Capability> = new Set();

  for (const cp of CAPABILITY_PATTERNS) {
    // Check patterns
    for (const pat of cp.patterns) {
      if (pat.test(prompt)) {
        detected.add(cp.capability);
        break;
      }
    }
    // Check keywords (if not already detected)
    if (!detected.has(cp.capability)) {
      for (const kw of cp.keywords) {
        if (lower.includes(kw)) {
          detected.add(cp.capability);
          break;
        }
      }
    }
  }

  const detectedArray = Array.from(detected);
  const incompatible = detectedArray.filter(c => SHELL_INCOMPATIBLE.has(c));
  const borderline = detectedArray.filter(c => SHELL_BORDERLINE.has(c));
  const shellFriendly = detectedArray.filter(c => !SHELL_INCOMPATIBLE.has(c) && !SHELL_BORDERLINE.has(c));

  return {
    detected: detectedArray,
    incompatible,
    borderline,
    shellFriendly,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY SCORER
// ══════════════════════════════════════════════════════════════════════════════

export interface ShellScore {
  shell: ShellId;
  score: number;
  strongMatches: number;
  acceptableMatches: number;
  missingCritical: Capability[];
}

export interface CapabilityValidationResult {
  capabilities: ExtractedCapabilities;
  shellScores: ShellScore[];
  bestShell: ShellId | null;
  bestScore: number;
  scoreGap: number;              // Gap between #1 and #2
  incompatibleCount: number;
  shouldAbstain: boolean;
  abstainReason: string | null;
  explanation: string;
}

const SCORE_WEIGHTS = {
  strong: 15,
  acceptable: 7,
  incompatiblePenalty: -100,  // Any incompatible capability = hard veto
  borderlinePenalty: -8,
};

const ABSTAIN_THRESHOLDS = {
  minBestScore: 20,     // Best shell must score at least this
  minScoreGap: 5,       // Best shell must lead by at least this over #2
  maxIncompatible: 0,   // Any incompatible capability = abstain
};

export function validateCapabilities(prompt: string): CapabilityValidationResult {
  const capabilities = extractCapabilities(prompt);
  const { detected, incompatible, borderline, shellFriendly } = capabilities;

  // Score each shell
  const shellScores: ShellScore[] = (['universal', 'dashboard', 'landing', 'kanban', 'wizard'] as ShellId[]).map(shell => {
    const profile = SHELL_PROFILES[shell];
    let score = 0;
    let strongMatches = 0;
    let acceptableMatches = 0;
    const missingCritical: Capability[] = [];

    // Score shell-friendly capabilities
    for (const cap of shellFriendly) {
      const support = profile[cap];
      if (support === 'strong') {
        score += SCORE_WEIGHTS.strong;
        strongMatches++;
      } else if (support === 'acceptable') {
        score += SCORE_WEIGHTS.acceptable;
        acceptableMatches++;
      }
      // unsupported = 0 points, but not a penalty unless critical
    }

    // Penalize borderline capabilities
    for (const cap of borderline) {
      const support = profile[cap];
      if (support === 'strong' || support === 'acceptable') {
        score += SCORE_WEIGHTS.acceptable; // Shell can handle it
      } else {
        score += SCORE_WEIGHTS.borderlinePenalty;
      }
    }

    // Incompatible capabilities are handled at the abstain level, not per-shell

    return { shell, score, strongMatches, acceptableMatches, missingCritical };
  });

  // Sort by score descending
  shellScores.sort((a, b) => b.score - a.score);

  const bestShellScore = shellScores[0];
  const secondScore = shellScores.length > 1 ? shellScores[1].score : 0;
  const scoreGap = bestShellScore.score - secondScore;

  // ── Abstain Logic ──
  let shouldAbstain = false;
  let abstainReason: string | null = null;

  // Rule 1: Any incompatible capability → abstain (strongest signal)
  if (incompatible.length > ABSTAIN_THRESHOLDS.maxIncompatible) {
    shouldAbstain = true;
    abstainReason = `Incompatible capabilities detected: ${incompatible.join(', ')}`;
  }

  // Rule 2: Many incompatible + borderline together → abstain
  if (!shouldAbstain && incompatible.length + borderline.length >= 2) {
    shouldAbstain = true;
    abstainReason = `Multiple risky capabilities: ${[...incompatible, ...borderline].join(', ')}`;
  }

  // Rule 3: Detected many capabilities (complex prompt) but shell covers too few
  // Only trigger for prompts with 6+ detected capabilities (complex apps)
  if (!shouldAbstain && detected.length >= 6 && bestShellScore.strongMatches + bestShellScore.acceptableMatches < detected.length * 0.25) {
    shouldAbstain = true;
    abstainReason = `Shell covers too few capabilities: ${bestShellScore.strongMatches + bestShellScore.acceptableMatches}/${detected.length} matched`;
  }

  const bestShell = shouldAbstain ? null : bestShellScore.shell;

  // Build explanation
  const explanationParts: string[] = [];
  explanationParts.push(`Detected ${detected.length} capabilities`);
  if (incompatible.length > 0) explanationParts.push(`${incompatible.length} incompatible: [${incompatible.join(', ')}]`);
  if (shellFriendly.length > 0) explanationParts.push(`${shellFriendly.length} shell-friendly`);
  if (shouldAbstain) {
    explanationParts.push(`ABSTAIN: ${abstainReason}`);
  } else {
    explanationParts.push(`Best: ${bestShell} (score: ${bestShellScore.score}, strong: ${bestShellScore.strongMatches}, gap: ${scoreGap})`);
  }

  return {
    capabilities,
    shellScores,
    bestShell,
    bestScore: bestShellScore.score,
    scoreGap,
    incompatibleCount: incompatible.length,
    shouldAbstain,
    abstainReason,
    explanation: explanationParts.join(' | '),
  };
}
