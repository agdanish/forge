/**
 * Deterministic AppSpec fixtures for composer kit validation.
 * One fixture per kit — realistic data, no LLM needed.
 */

import type { AppSpec } from '../../src/shells/spec.js';

export const CHAT_INBOX_FIXTURE: AppSpec = {
  appName: 'SupportDesk Pro',
  tagline: 'Manage customer support conversations in one place',
  domain: 'Customer Support',
  primaryEntity: 'Conversation',
  primaryEntityPlural: 'Conversations',
  primaryAction: 'Manage',
  shell: 'universal',
  theme: 'neutral-dark',
  categories: ['Open', 'Pending', 'Resolved', 'Spam', 'VIP', 'Escalated'],
  kpis: [
    { label: 'Open Tickets', value: '24', trend: '-8%', trendUp: false },
    { label: 'Avg Response', value: '4m', trend: '-12%', trendUp: false },
    { label: 'Resolved Today', value: '18', trend: '+15%', trendUp: true },
    { label: 'CSAT Score', value: '94%', trend: '+2%', trendUp: true },
  ],
  seedData: [
    { name: 'Login Issue', description: 'Cannot access account after password reset', status: 'active', priority: 'high', category: 'Open', value: 0, date: '2026-03-14', assignee: 'Alice Chen' },
    { name: 'Billing Question', description: 'Charged twice for subscription', status: 'active', priority: 'high', category: 'VIP', value: 0, date: '2026-03-14', assignee: 'Bob Smith' },
    { name: 'Feature Request', description: 'Add dark mode to mobile app', status: 'pending', priority: 'low', category: 'Pending', value: 0, date: '2026-03-13', assignee: 'Carol Davis' },
    { name: 'API Error 500', description: 'Intermittent server errors on /api/users', status: 'active', priority: 'high', category: 'Escalated', value: 0, date: '2026-03-14', assignee: 'Dave Wilson' },
    { name: 'Onboarding Help', description: 'New customer needs setup walkthrough', status: 'active', priority: 'medium', category: 'Open', value: 0, date: '2026-03-13', assignee: 'Alice Chen' },
  ],
  views: ['Inbox', 'All Tickets', 'My Tickets'],
};

export const FEED_SOCIAL_FIXTURE: AppSpec = {
  appName: 'DevConnect',
  tagline: 'A developer community for sharing ideas and projects',
  domain: 'Developer Community',
  primaryEntity: 'Post',
  primaryEntityPlural: 'Posts',
  primaryAction: 'Share',
  shell: 'universal',
  theme: 'neutral-dark',
  categories: ['General', 'Show & Tell', 'Questions', 'Jobs', 'Events', 'Resources'],
  kpis: [
    { label: 'Total Posts', value: '1.2K', trend: '+22%', trendUp: true },
    { label: 'Active Users', value: '340', trend: '+8%', trendUp: true },
    { label: 'Comments Today', value: '89', trend: '+15%', trendUp: true },
    { label: 'Trending Topics', value: '12', trend: '+3', trendUp: true },
  ],
  seedData: [
    { name: 'Built a CLI tool', description: 'Just shipped my first Rust CLI', status: 'active', priority: 'medium', category: 'Show & Tell', value: 42, date: '2026-03-14', assignee: 'rustdev99' },
    { name: 'How to test React hooks?', description: 'Best practices for testing custom hooks', status: 'active', priority: 'medium', category: 'Questions', value: 15, date: '2026-03-14', assignee: 'reactfan' },
    { name: 'Senior Eng at Acme', description: 'We are hiring senior engineers', status: 'active', priority: 'low', category: 'Jobs', value: 8, date: '2026-03-13', assignee: 'acme_hr' },
    { name: 'React Conf 2026', description: 'Virtual conference March 20', status: 'active', priority: 'medium', category: 'Events', value: 56, date: '2026-03-12', assignee: 'eventbot' },
    { name: 'Free TypeScript course', description: 'Complete TS course now free', status: 'active', priority: 'low', category: 'Resources', value: 120, date: '2026-03-11', assignee: 'learnts' },
  ],
  views: ['Feed', 'Trending', 'Saved'],
};

export const STORE_CATALOG_FIXTURE: AppSpec = {
  appName: 'FreshMart',
  tagline: 'Fresh groceries delivered to your door',
  domain: 'Grocery Delivery',
  primaryEntity: 'Product',
  primaryEntityPlural: 'Products',
  primaryAction: 'Order',
  shell: 'universal',
  theme: 'neutral-dark',
  categories: ['Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Meat', 'Beverages'],
  kpis: [
    { label: 'Products', value: '248', trend: '+12', trendUp: true },
    { label: 'Orders Today', value: '34', trend: '+18%', trendUp: true },
    { label: 'Avg Order', value: '$42', trend: '+5%', trendUp: true },
    { label: 'Delivery Time', value: '25m', trend: '-8%', trendUp: false },
  ],
  seedData: [
    { name: 'Organic Bananas', description: 'Fresh organic bananas, 1 bunch', status: 'active', priority: 'medium', category: 'Fruits', value: 299, date: '2026-03-14', assignee: 'FreshFarms' },
    { name: 'Sourdough Bread', description: 'Artisan sourdough loaf', status: 'active', priority: 'medium', category: 'Bakery', value: 549, date: '2026-03-14', assignee: 'LocalBakery' },
    { name: 'Whole Milk', description: 'Organic whole milk 1 gallon', status: 'active', priority: 'medium', category: 'Dairy', value: 499, date: '2026-03-14', assignee: 'DairyFresh' },
    { name: 'Chicken Breast', description: 'Free-range chicken breast 1lb', status: 'active', priority: 'medium', category: 'Meat', value: 799, date: '2026-03-14', assignee: 'FarmMeats' },
    { name: 'Mixed Greens', description: 'Organic mixed salad greens', status: 'active', priority: 'medium', category: 'Vegetables', value: 399, date: '2026-03-14', assignee: 'GreenGrow' },
    { name: 'Orange Juice', description: 'Fresh squeezed OJ 64oz', status: 'active', priority: 'medium', category: 'Beverages', value: 649, date: '2026-03-14', assignee: 'JuiceCo' },
  ],
  views: ['Grid', 'List', 'Cart'],
};

export const MAP_SPLITVIEW_FIXTURE: AppSpec = {
  appName: 'StayFinder',
  tagline: 'Discover and book the perfect vacation rental',
  domain: 'Travel Booking',
  primaryEntity: 'Property',
  primaryEntityPlural: 'Properties',
  primaryAction: 'Book',
  shell: 'universal',
  theme: 'neutral-dark',
  categories: ['Beach', 'Mountain', 'City', 'Countryside', 'Lake', 'Desert'],
  kpis: [
    { label: 'Listings', value: '1,240', trend: '+8%', trendUp: true },
    { label: 'Avg Rating', value: '4.7', trend: '+0.2', trendUp: true },
    { label: 'Bookings', value: '89', trend: '+15%', trendUp: true },
    { label: 'Avg Price', value: '$185/n', trend: '-3%', trendUp: false },
  ],
  seedData: [
    { name: 'Ocean View Villa', description: 'Beachfront 3BR with pool', status: 'active', priority: 'high', category: 'Beach', value: 350, date: '2026-03-20', assignee: 'Malibu, CA' },
    { name: 'Mountain Cabin', description: 'Cozy 2BR log cabin with fireplace', status: 'active', priority: 'medium', category: 'Mountain', value: 175, date: '2026-03-18', assignee: 'Aspen, CO' },
    { name: 'Downtown Loft', description: 'Modern 1BR in arts district', status: 'active', priority: 'medium', category: 'City', value: 120, date: '2026-03-22', assignee: 'Austin, TX' },
    { name: 'Lakeside Retreat', description: '4BR home with private dock', status: 'active', priority: 'high', category: 'Lake', value: 280, date: '2026-03-25', assignee: 'Lake Tahoe, NV' },
    { name: 'Tuscan Farmhouse', description: 'Restored farmhouse with vineyard views', status: 'active', priority: 'medium', category: 'Countryside', value: 220, date: '2026-03-28', assignee: 'Napa, CA' },
  ],
  views: ['Map', 'List', 'Saved'],
};

export const MEDIA_PLAYER_FIXTURE: AppSpec = {
  appName: 'WaveStream',
  tagline: 'Your personal music streaming experience',
  domain: 'Music Streaming',
  primaryEntity: 'Track',
  primaryEntityPlural: 'Tracks',
  primaryAction: 'Play',
  shell: 'universal',
  theme: 'neutral-dark',
  categories: ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical'],
  kpis: [
    { label: 'Library', value: '2,480', trend: '+45', trendUp: true },
    { label: 'Playlists', value: '18', trend: '+3', trendUp: true },
    { label: 'Hours Played', value: '142', trend: '+12%', trendUp: true },
    { label: 'Favorites', value: '86', trend: '+8', trendUp: true },
  ],
  seedData: [
    { name: 'Midnight Drive', description: 'Synthwave anthem', status: 'active', priority: 'medium', category: 'Electronic', value: 234, date: '2026-03-14', assignee: 'Neon Pulse' },
    { name: 'City Lights', description: 'Upbeat pop single', status: 'active', priority: 'medium', category: 'Pop', value: 198, date: '2026-03-13', assignee: 'Luna Ray' },
    { name: 'Thunder Road', description: 'Classic rock revival', status: 'active', priority: 'medium', category: 'Rock', value: 312, date: '2026-03-12', assignee: 'Steel Canyon' },
    { name: 'Blue Note Session', description: 'Live jazz recording', status: 'active', priority: 'medium', category: 'Jazz', value: 445, date: '2026-03-11', assignee: 'The Quartet' },
    { name: 'Flow State', description: 'Hip hop instrumental', status: 'active', priority: 'medium', category: 'Hip Hop', value: 180, date: '2026-03-10', assignee: 'BeatSmith' },
  ],
  views: ['Library', 'Playlists', 'Now Playing'],
};

export const EDITOR_LITE_FIXTURE: AppSpec = {
  appName: 'DesignPad',
  tagline: 'Quick poster and banner design tool',
  domain: 'Graphic Design',
  primaryEntity: 'Design',
  primaryEntityPlural: 'Designs',
  primaryAction: 'Create',
  shell: 'universal',
  theme: 'neutral-dark',
  categories: ['Poster', 'Banner', 'Card', 'Flyer', 'Social Media', 'Presentation'],
  kpis: [
    { label: 'Designs', value: '32', trend: '+5', trendUp: true },
    { label: 'Templates', value: '24', trend: '+8', trendUp: true },
    { label: 'Exports', value: '18', trend: '+22%', trendUp: true },
    { label: 'Shared', value: '7', trend: '+3', trendUp: true },
  ],
  seedData: [
    { name: 'Summer Sale Banner', description: '1200x628 web banner', status: 'active', priority: 'high', category: 'Banner', value: 0, date: '2026-03-14', assignee: 'Marketing' },
    { name: 'Event Poster', description: 'Concert poster 18x24', status: 'active', priority: 'medium', category: 'Poster', value: 0, date: '2026-03-13', assignee: 'Events' },
    { name: 'Instagram Story', description: '1080x1920 story template', status: 'active', priority: 'medium', category: 'Social Media', value: 0, date: '2026-03-12', assignee: 'Social' },
    { name: 'Business Card', description: 'Standard 3.5x2 card', status: 'completed', priority: 'low', category: 'Card', value: 0, date: '2026-03-10', assignee: 'HR' },
    { name: 'Workshop Flyer', description: 'A5 workshop announcement', status: 'pending', priority: 'medium', category: 'Flyer', value: 0, date: '2026-03-15', assignee: 'Training' },
  ],
  views: ['Canvas', 'Templates', 'My Designs'],
};

/** Test prompts that should route to each kit */
export const COMPOSER_TEST_PROMPTS: Record<string, { prompt: string; expectedKit: string }> = {
  'chat-inbox-1': {
    prompt: 'Build a customer support inbox with threaded conversations and ticket management',
    expectedKit: 'chat-inbox',
  },
  'chat-inbox-2': {
    prompt: 'Create a team messaging app like Slack with channels and direct messages',
    expectedKit: 'chat-inbox',
  },
  'feed-social-1': {
    prompt: 'Build a community feed like Reddit where users can post, comment, and upvote',
    expectedKit: 'feed-social',
  },
  'feed-social-2': {
    prompt: 'Create a social media platform with a news feed, likes, and trending topics',
    expectedKit: 'feed-social',
  },
  'store-catalog-1': {
    prompt: 'Build an e-commerce store with product catalog, shopping cart, and checkout',
    expectedKit: 'store-catalog',
  },
  'store-catalog-2': {
    prompt: 'Create a restaurant food ordering app with a menu and cart',
    expectedKit: 'store-catalog',
  },
  'map-splitview-1': {
    prompt: 'Build a hotel booking app with a map view showing available properties',
    expectedKit: 'map-splitview',
  },
  'map-splitview-2': {
    prompt: 'Create an Airbnb-like vacation rental discovery app with map and list views',
    expectedKit: 'map-splitview',
  },
  'media-player-1': {
    prompt: 'Build a music player app like Spotify with playlists and now playing',
    expectedKit: 'media-player',
  },
  'media-player-2': {
    prompt: 'Create a podcast player with episode list, progress timeline, and chapters',
    expectedKit: 'media-player',
  },
  'editor-lite-1': {
    prompt: 'Build a poster designer tool with a canvas, shapes, and text editing',
    expectedKit: 'editor-lite',
  },
  'editor-lite-2': {
    prompt: 'Create a whiteboard app for brainstorming with sticky notes and drawing',
    expectedKit: 'editor-lite',
  },
};

/** Prompts that should NOT match any kit (should abstain) */
export const COMPOSER_NEGATIVE_PROMPTS = [
  'Build a task management app with categories and priorities',
  'Create an analytics dashboard for sales metrics',
  'Build a landing page for a SaaS product',
  'Create a kanban board for project management',
  'Build a step-by-step onboarding wizard',
  'Create a simple calculator app',
  'Build a 3D game with WebGL',
];

export const ALL_COMPOSER_FIXTURES = {
  'chat-inbox': CHAT_INBOX_FIXTURE,
  'feed-social': FEED_SOCIAL_FIXTURE,
  'store-catalog': STORE_CATALOG_FIXTURE,
  'map-splitview': MAP_SPLITVIEW_FIXTURE,
  'media-player': MEDIA_PLAYER_FIXTURE,
  'editor-lite': EDITOR_LITE_FIXTURE,
};
