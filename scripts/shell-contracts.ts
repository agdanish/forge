/**
 * Shell Capability Contracts — defines what each shell MUST deliver.
 * Used by the exploratory validation harness to verify shell output.
 */

export interface ShellContract {
  shell: string;
  /** CSS selectors that MUST exist in the rendered page */
  requiredSelectors: string[];
  /** Text strings that MUST appear somewhere in the page */
  requiredText: string[];
  /** Interactive elements to test — each must cause a DOM change */
  interactiveChecks: InteractiveCheck[];
  /** Minimum number of visible elements above the fold (viewport height) */
  minAboveFoldElements: number;
  /** Description for reporting */
  description: string;
}

export interface InteractiveCheck {
  /** How to find the element */
  selector: string;
  /** What should change after clicking/typing */
  expectation: 'dom-change' | 'new-element' | 'class-change' | 'text-change';
  /** Description of what this check validates */
  description: string;
  /** If true, element might not exist (skip gracefully) */
  optional?: boolean;
  /** Type text into input before checking DOM change */
  typeText?: string;
}

export const SHELL_CONTRACTS: Record<string, ShellContract> = {
  universal: {
    shell: 'universal',
    description: 'Workspace CRUD — sidebar, search, KPIs, data table, detail panel, add modal',
    requiredSelectors: [
      'input',               // Search or form input
      'button',              // At least one button
    ],
    requiredText: [
      'Task',                // Primary entity somewhere
      'Dashboard',           // View name
    ],
    interactiveChecks: [
      {
        selector: 'input[placeholder*="earch"]',
        expectation: 'dom-change',
        description: 'Search input filters data when text is typed',
        typeText: 'xyz_no_match',
      },
    ],
    minAboveFoldElements: 6,
  },

  dashboard: {
    shell: 'dashboard',
    description: 'Analytics dashboard — KPI cards, charts, data table, filters',
    requiredSelectors: [
      'button',              // At least one button
    ],
    requiredText: [
      'Revenue',             // KPI label
      'Deal',                // Entity
    ],
    interactiveChecks: [
      {
        selector: 'input[placeholder*="earch"]',
        expectation: 'dom-change',
        description: 'Search input filters table data',
        typeText: 'xyz_no_match',
        optional: true,
      },
    ],
    minAboveFoldElements: 5,
  },

  landing: {
    shell: 'landing',
    description: 'Landing page — hero, features, pricing, FAQ',
    requiredSelectors: [
      'button, a',           // CTA buttons
    ],
    requiredText: [
      'LaunchPad',           // App name in hero
    ],
    interactiveChecks: [],   // Landing pages are mostly static — no mandatory interactions
    minAboveFoldElements: 4,
  },

  kanban: {
    shell: 'kanban',
    description: 'Kanban board — stage columns, cards, detail modal, filters',
    requiredSelectors: [
      'button',
      'input',               // Search input
    ],
    requiredText: [
      'Hire Stream',         // App name (entity "Candidate" may not appear as standalone text)
    ],
    interactiveChecks: [
      {
        selector: 'input[placeholder*="earch"]',
        expectation: 'dom-change',
        description: 'Search input filters kanban cards',
        typeText: 'xyz_no_match',
        optional: true,
      },
    ],
    minAboveFoldElements: 4,
  },

  wizard: {
    shell: 'wizard',
    description: 'Wizard — step progress, option cards, navigation, review, result',
    requiredSelectors: [
      'button',
    ],
    requiredText: [
      'FitMatch',            // App name
    ],
    interactiveChecks: [
      {
        selector: 'button:has-text("Continue"), button:has-text("Get Started"), button:has-text("Next")',
        expectation: 'dom-change',
        description: 'Continue/Next button advances wizard step',
      },
    ],
    minAboveFoldElements: 3,
  },
};
