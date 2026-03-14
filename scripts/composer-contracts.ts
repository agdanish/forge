/**
 * Per-kit browser validation contracts.
 * Each contract defines selectors, text, and interactive checks
 * that a correctly rendered kit output must satisfy.
 */

export interface InteractiveCheck {
  selector: string;
  description: string;
  typeText?: string;
  optional?: boolean;
}

export interface KitContract {
  kitId: string;
  requiredSelectors: string[];
  requiredText: string[];
  minAboveFoldElements: number;
  interactiveChecks: InteractiveCheck[];
}

export const KIT_CONTRACTS: Record<string, KitContract> = {
  'chat-inbox': {
    kitId: 'chat-inbox',
    requiredSelectors: [
      'button',
      'input',
    ],
    requiredText: [
      'SupportDesk Pro',
    ],
    minAboveFoldElements: 4,
    interactiveChecks: [
      {
        selector: 'input[placeholder*="earch"], input[placeholder*="essage"], input[placeholder*="ype"]',
        description: 'Type in search/message input',
        typeText: 'test message',
        optional: true,
      },
      {
        selector: 'button:nth-of-type(2)',
        description: 'Click a filter/action button',
        optional: true,
      },
    ],
  },

  'feed-social': {
    kitId: 'feed-social',
    requiredSelectors: [
      'button',
    ],
    requiredText: [
      'DevConnect',
    ],
    minAboveFoldElements: 3,
    interactiveChecks: [
      {
        selector: 'button',
        description: 'Click a button (like/comment/tab)',
      },
    ],
  },

  'store-catalog': {
    kitId: 'store-catalog',
    requiredSelectors: [
      'button',
    ],
    requiredText: [
      'FreshMart',
    ],
    minAboveFoldElements: 3,
    interactiveChecks: [
      {
        selector: 'button',
        description: 'Click a button (add to cart/filter)',
      },
    ],
  },

  'map-splitview': {
    kitId: 'map-splitview',
    requiredSelectors: [
      'button',
    ],
    requiredText: [
      'StayFinder',
    ],
    minAboveFoldElements: 3,
    interactiveChecks: [
      {
        selector: 'button',
        description: 'Click a button (filter/save/details)',
      },
    ],
  },

  'media-player': {
    kitId: 'media-player',
    requiredSelectors: [
      'button',
    ],
    requiredText: [
      'WaveStream',
    ],
    minAboveFoldElements: 3,
    interactiveChecks: [
      {
        selector: 'button:nth-of-type(2)',
        description: 'Click a category/view button',
        optional: true,
      },
    ],
  },

  'editor-lite': {
    kitId: 'editor-lite',
    requiredSelectors: [
      'button',
    ],
    requiredText: [
      'DesignPad',
    ],
    minAboveFoldElements: 3,
    interactiveChecks: [
      {
        selector: 'button:nth-of-type(3)',
        description: 'Click a tool button',
        optional: true,
      },
    ],
  },
};
