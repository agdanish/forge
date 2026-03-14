/**
 * Component Kit Definitions — 6 reusable hard-prompt interaction families.
 * Each kit is a deterministic React app generator for a known UI pattern.
 *
 * Kits bridge the gap between shells (too simple) and raw LLM (too expensive).
 */

export type KitId = 'chat-inbox' | 'feed-social' | 'store-catalog' | 'map-splitview' | 'media-player' | 'editor-lite';

export type KitCapability =
  // Chat / Inbox
  | 'conversation_list' | 'thread_panel' | 'message_composer' | 'assignee_metadata'
  | 'unread_state' | 'tag_status' | 'conversation_search'
  // Feed / Social
  | 'post_stream' | 'post_cards' | 'topic_tabs' | 'like_save_state'
  | 'comment_panel' | 'post_entry' | 'feed_mode_switch'
  // Store / Catalog
  | 'item_grid' | 'item_detail_modal' | 'cart_drawer' | 'quantity_update'
  | 'compare_shortlist' | 'pricing_summary' | 'checkout_summary'
  // Map / Split-View
  | 'split_layout' | 'faux_map_panel' | 'location_markers' | 'list_selection_sync'
  | 'route_summary' | 'saved_items' | 'filter_chips' | 'detail_pane'
  // Media / Player
  | 'now_playing' | 'queue_playlist' | 'progress_timeline' | 'chapter_bookmarks'
  | 'library_nav' | 'info_panel'
  // Editor-Lite
  | 'canvas_area' | 'selectable_objects' | 'tool_panel' | 'properties_panel'
  | 'template_palette' | 'preview_toggle';

export interface KitProfile {
  id: KitId;
  name: string;
  description: string;
  /** Capabilities this kit delivers strongly */
  strong: KitCapability[];
  /** Prompt families this kit serves */
  promptFamilies: string[];
  /** Keywords that trigger this kit */
  keywords: string[];
  /** Regex patterns for stronger matching */
  patterns: RegExp[];
  /** Risk notes */
  riskNotes: string;
}

export const KIT_PROFILES: Record<KitId, KitProfile> = {
  'chat-inbox': {
    id: 'chat-inbox',
    name: 'Chat / Inbox Kit',
    description: 'Support inbox, team messaging, threaded conversations, customer chat workspace',
    strong: ['conversation_list', 'thread_panel', 'message_composer', 'assignee_metadata', 'unread_state', 'tag_status', 'conversation_search'],
    promptFamilies: ['support inbox', 'team messaging', 'help desk', 'customer chat', 'channel messaging', 'ticket inbox'],
    keywords: ['inbox', 'support', 'help desk', 'helpdesk', 'ticket', 'chat workspace', 'team chat', 'customer support', 'conversation', 'thread', 'messaging', 'channel', 'direct message', 'dm'],
    patterns: [
      /\b(?:support|help)\s*(?:desk|inbox|chat|center)\b/i,
      /\b(?:team|internal|customer)\s+(?:chat|messaging)\b/i,
      /\b(?:ticket|conversation|thread)\s+(?:inbox|manager|workspace|panel)\b/i,
      /\bchat\s+(?:app|application|interface|workspace)\b/i,
      /\bmessaging\s+(?:app|platform|tool)\b/i,
      /\bslack[\s-]like\b/i,
      /\bemail\s+(?:client|inbox)\b/i,
    ],
    riskNotes: 'No real-time/WebSocket. No actual message delivery. Simulated conversation state only.',
  },
  'feed-social': {
    id: 'feed-social',
    name: 'Feed / Social Kit',
    description: 'Community feed, post stream, discussion list, social activity',
    strong: ['post_stream', 'post_cards', 'topic_tabs', 'like_save_state', 'comment_panel', 'post_entry', 'feed_mode_switch'],
    promptFamilies: ['community feed', 'social media', 'discussion forum', 'news feed', 'blog platform'],
    keywords: ['feed', 'social', 'community', 'post', 'comment', 'like', 'upvote', 'follow', 'trending', 'discussion', 'forum', 'blog', 'news feed'],
    patterns: [
      /\bsocial\s+(?:media|network|feed|platform)\b/i,
      /\bcommunity\s+(?:feed|forum|platform|board)\b/i,
      /\b(?:twitter|reddit|instagram|facebook)\s*(?:clone|like|style)\b/i,
      /\bnews\s+feed\b/i,
      /\b(?:post|discussion)\s+(?:feed|stream|board)\b/i,
    ],
    riskNotes: 'No real users. No actual social graph. Simulated posts/comments with mock data.',
  },
  'store-catalog': {
    id: 'store-catalog',
    name: 'Store / Catalog / Cart Kit',
    description: 'E-commerce, ordering, product catalog, shortlist/compare/cart flows',
    strong: ['item_grid', 'item_detail_modal', 'cart_drawer', 'quantity_update', 'compare_shortlist', 'pricing_summary', 'checkout_summary'],
    promptFamilies: ['e-commerce store', 'product catalog', 'food ordering', 'marketplace', 'menu ordering'],
    keywords: ['store', 'shop', 'ecommerce', 'e-commerce', 'cart', 'checkout', 'buy', 'order', 'marketplace', 'catalog', 'product', 'menu', 'food order', 'restaurant'],
    patterns: [
      /\b(?:online|e-?commerce)\s+store\b/i,
      /\b(?:shopping|product)\s+(?:cart|catalog)\b/i,
      /\bcheckout\s+(?:flow|page|process)\b/i,
      /\bfood\s+(?:delivery|ordering)\b/i,
      /\bordering\s+app\b/i,
      /\bmarketplace\b/i,
      /\brestaurant\s+(?:menu|ordering|cards?)\b/i,
    ],
    riskNotes: 'No real payment processing. No backend. Cart/checkout is local state only.',
  },
  'map-splitview': {
    id: 'map-splitview',
    name: 'Map / Split-View / Route Kit',
    description: 'Booking, discovery, route planning, ride flow, real estate explorer',
    strong: ['split_layout', 'faux_map_panel', 'location_markers', 'list_selection_sync', 'route_summary', 'saved_items', 'filter_chips', 'detail_pane'],
    promptFamilies: ['travel booking', 'ride booking', 'route planner', 'real estate explorer', 'location discovery', 'hotel booking'],
    keywords: ['map', 'route', 'booking', 'travel', 'ride', 'location', 'nearby', 'pickup', 'dropoff', 'hotel', 'property', 'real estate', 'discovery', 'explore', 'itinerary'],
    patterns: [
      /\bmap\s+(?:markers?|view|pins?)\b/i,
      /\bmap[\s/]+list\s+split\b/i,
      /\broute\s+(?:planner|planning)\b/i,
      /\b(?:travel|ride|hotel)\s+booking\b/i,
      /\blocation[\s-]based\s+(?:discovery|app)\b/i,
      /\b(?:uber|airbnb|lyft)[\s-](?:like|clone|style)\b/i,
      /\bitinerary\b/i,
      /\bneighborhood\b/i,
    ],
    riskNotes: 'No real map provider. Faux map panel with CSS grid/gradient. Simulated markers/pins.',
  },
  'media-player': {
    id: 'media-player',
    name: 'Media / Player Kit',
    description: 'Music player, course video player, playlist/queue apps',
    strong: ['now_playing', 'queue_playlist', 'progress_timeline', 'chapter_bookmarks', 'library_nav', 'info_panel'],
    promptFamilies: ['music player', 'video player', 'course player', 'podcast player', 'audio player'],
    keywords: ['player', 'music', 'playlist', 'now playing', 'queue', 'video', 'audio', 'podcast', 'chapter', 'transcript', 'course video', 'media'],
    patterns: [
      /\b(?:music|video|audio|media|podcast)\s+player\b/i,
      /\bspotify[\s-](?:like|clone|style)\b/i,
      /\bnetflix[\s-](?:like|clone|style)\b/i,
      /\bnow[\s-]playing\b/i,
      /\bchapter\s+timeline\b/i,
      /\bcourse\s+(?:video|player)\b/i,
    ],
    riskNotes: 'No real media streaming. Simulated progress bar/timeline. Mock playlist data.',
  },
  'editor-lite': {
    id: 'editor-lite',
    name: 'Editor-Lite / Canvas-Lite Kit',
    description: 'Poster designer, wireframe tool, whiteboard-lite, diagram-lite',
    strong: ['canvas_area', 'selectable_objects', 'tool_panel', 'properties_panel', 'template_palette', 'preview_toggle'],
    promptFamilies: ['poster designer', 'wireframe tool', 'whiteboard', 'diagram builder', 'design tool'],
    keywords: ['canvas', 'whiteboard', 'wireframe', 'diagram', 'poster', 'designer', 'editor', 'drawing', 'design tool', 'sticky notes', 'blocks'],
    patterns: [
      /\b(?:poster|flyer|banner)\s+designer\b/i,
      /\bwireframe?\s+(?:tool|builder)\b/i,
      /\bwhiteboard\b/i,
      /\bdiagram\s+builder\b/i,
      /\b(?:design|editor)\s+(?:tool|canvas|app)\b/i,
      /\bbrainstorming\s+canvas\b/i,
      /\b(?:drag|place)\s+(?:blocks?|elements?|shapes?)\b/i,
    ],
    riskNotes: 'No real infinite canvas or multi-user collab. Single-user, constrained canvas with mock objects.',
  },
};

// ══════════════════════════════════════════════════
// COMPOSITION COMPATIBILITY
// ══════════════════════════════════════════════════

export type CompositionSafety = 'safe' | 'risky' | 'incompatible';

/** Defines which kit pairs can coexist in one app */
const COMPOSITION_RULES: Record<string, CompositionSafety> = {
  // Safe combinations
  'chat-inbox+store-catalog': 'risky',       // support + store is unusual
  'store-catalog+map-splitview': 'safe',      // food delivery, travel booking
  'media-player+feed-social': 'risky',        // spotify social — complex
  'chat-inbox+feed-social': 'risky',          // chat + feed is complex

  // Incompatible
  'editor-lite+chat-inbox': 'incompatible',
  'editor-lite+feed-social': 'incompatible',
  'editor-lite+store-catalog': 'incompatible',
  'editor-lite+media-player': 'incompatible',
  'editor-lite+map-splitview': 'incompatible',
};

export function getCompositionSafety(kit1: KitId, kit2: KitId): CompositionSafety {
  const key1 = `${kit1}+${kit2}`;
  const key2 = `${kit2}+${kit1}`;
  return COMPOSITION_RULES[key1] || COMPOSITION_RULES[key2] || 'risky';
}

export const ALL_KIT_IDS: KitId[] = ['chat-inbox', 'feed-social', 'store-catalog', 'map-splitview', 'media-player', 'editor-lite'];
