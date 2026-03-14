/**
 * Deterministic App Composer — assembles complete front-end apps from kits.
 *
 * Takes a prompt + AppSpec, selects the best kit, and renders a full App.tsx.
 * Integrates with existing theme/domain-pack systems.
 */

import type { AppSpec } from '../shells/spec.js';
import type { KitId } from './kits.js';
import { scoreKitComposition, type ComposerScoreResult } from './scorer.js';
export type { ComposerScoreResult } from './scorer.js';
import { renderChatInboxKit } from './renderers/chat-inbox.js';
import { renderFeedSocialKit } from './renderers/feed-social.js';
import { renderStoreCatalogKit } from './renderers/store-catalog.js';
import { renderMapSpliviewKit } from './renderers/map-splitview.js';
import { renderMediaPlayerKit } from './renderers/media-player.js';
import { renderEditorLiteKit } from './renderers/editor-lite.js';
import { getBoilerplateFiles } from '../templates/boilerplate.js';
import { logger } from '../utils/logger.js';

export interface ComposerResult {
  appTsx: string;
  readmeMd: string;
  spec: AppSpec;
  kit: KitId;
  files: { path: string; content: string }[];
  scoring: ComposerScoreResult;
}

const KIT_RENDERERS: Record<KitId, (spec: AppSpec) => string> = {
  'chat-inbox': renderChatInboxKit,
  'feed-social': renderFeedSocialKit,
  'store-catalog': renderStoreCatalogKit,
  'map-splitview': renderMapSpliviewKit,
  'media-player': renderMediaPlayerKit,
  'editor-lite': renderEditorLiteKit,
};

/**
 * Try to compose an app from kits for the given prompt.
 * Returns null if no kit can serve the prompt.
 */
export function composeFromPrompt(prompt: string, spec: AppSpec): ComposerResult | null {
  const scoring = scoreKitComposition(prompt);

  if (scoring.shouldAbstain || scoring.selectedKits.length === 0) {
    logger.info(`[COMPOSER] Abstained: ${scoring.decisiveReason}`);
    return null;
  }

  // Use primary kit (multi-kit composition uses strongest only for now)
  const primaryKit = scoring.selectedKits[0];
  const renderer = KIT_RENDERERS[primaryKit];

  if (!renderer) {
    logger.warn(`[COMPOSER] No renderer for kit: ${primaryKit}`);
    return null;
  }

  const appTsx = renderer(spec);
  const readmeMd = generateComposerReadme(spec, primaryKit);

  // Combine boilerplate + generated files
  const boilerplate = getBoilerplateFiles().map(f => {
    if (f.path === 'index.html') {
      return { ...f, content: f.content.replace('<title>App</title>', `<title>${spec.appName}</title>`) };
    }
    return f;
  });

  const files = [
    ...boilerplate,
    { path: 'src/App.tsx', content: appTsx },
    { path: 'README.md', content: readmeMd },
  ];

  logger.info(`[COMPOSER] Rendered kit: ${primaryKit} | App: ${spec.appName} | Score: ${scoring.compositionScore} | Files: ${files.length}`);

  return {
    appTsx,
    readmeMd,
    spec,
    kit: primaryKit,
    files,
    scoring,
  };
}

/**
 * Check if the composer lane can handle this prompt.
 * Fast check — call before full spec extraction.
 */
export function canCompose(prompt: string): { canHandle: boolean; scoring: ComposerScoreResult } {
  const scoring = scoreKitComposition(prompt);
  return {
    canHandle: !scoring.shouldAbstain && scoring.selectedKits.length > 0,
    scoring,
  };
}

function generateComposerReadme(spec: AppSpec, kit: KitId): string {
  return `# ${spec.appName}

${spec.tagline}

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- **Interactive ${kit.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}**: Full-featured UI with real interactions
- **${spec.domain} Theme**: Domain-specific color scheme and styling
- **Responsive Design**: Works on desktop and mobile
- **Local State**: All data managed client-side with React hooks

## Tech Stack

- React 18 + TypeScript
- Vite (fast dev server + build)
- Tailwind CSS (utility-first styling)
- Lucide React (icons)

## Build

\`\`\`bash
npm run build
\`\`\`

Output is in the \`dist/\` directory.
`;
}
