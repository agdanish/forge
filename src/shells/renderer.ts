/**
 * Shell renderer pipeline:
 *   1. Extract AppSpec from job prompt (via LLM or fallback)
 *   2. Select shell (universal vs dashboard)
 *   3. Render shell → App.tsx string
 *   4. Package with boilerplate → ZIP-ready file set
 */

import { AppSpec, getSpecExtractionPrompt, parseAppSpec, generateFallbackSpec } from './spec.js';
import { renderUniversalShell } from './universal.js';
import { renderDashboardShell } from './dashboard.js';
import { renderLandingShell } from './landing.js';
import { getBoilerplateFiles } from '../templates/boilerplate.js';
import { logger } from '../utils/logger.js';

export interface ShellRenderResult {
  appTsx: string;
  readmeMd: string;
  spec: AppSpec;
  shell: 'universal' | 'dashboard' | 'landing';
  files: { path: string; content: string }[];
}

/**
 * Render a complete file set from an AppSpec.
 * This is the DETERMINISTIC path — no LLM needed for rendering.
 */
export function renderFromSpec(spec: AppSpec): ShellRenderResult {
  const shell = spec.shell || 'universal';
  const appTsx = shell === 'dashboard'
    ? renderDashboardShell(spec)
    : shell === 'landing'
    ? renderLandingShell(spec)
    : renderUniversalShell(spec);

  const readmeMd = generateReadme(spec);

  // Combine boilerplate + generated files
  const boilerplate = getBoilerplateFiles().map(f => {
    // Inject app name into HTML title
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

  logger.info(`Shell rendered: ${shell} | App: ${spec.appName} | Domain: ${spec.domain} | Entity: ${spec.primaryEntity} | Files: ${files.length}`);

  return { appTsx, readmeMd, spec, shell, files };
}

/**
 * Full pipeline: prompt → spec (via LLM or fallback) → rendered files.
 * If llmExtract is provided, uses it to extract spec from prompt.
 * Otherwise falls back to deterministic spec generation.
 */
export async function renderFromPrompt(
  prompt: string,
  llmExtract?: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<ShellRenderResult> {
  let spec: AppSpec | null = null;

  // Try LLM extraction first (fast, cheap — just JSON, no code)
  if (llmExtract) {
    try {
      const extractionPrompt = getSpecExtractionPrompt(prompt);
      logger.info('Extracting AppSpec via LLM...');
      const startMs = Date.now();
      const raw = await llmExtract(
        'You are a product architect. Output ONLY valid JSON. No explanation, no markdown fences.',
        extractionPrompt
      );
      const elapsed = Date.now() - startMs;
      logger.info(`LLM spec extraction took ${elapsed}ms`);

      spec = parseAppSpec(raw);
      if (spec) {
        logger.info(`LLM spec extracted: ${spec.appName} (${spec.domain}) — shell: ${spec.shell}`);
      } else {
        logger.warn('LLM returned unparseable spec, falling back to deterministic');
      }
    } catch (err) {
      logger.warn(`LLM spec extraction failed: ${(err as Error).message}`);
    }
  }

  // Fallback: deterministic spec from keywords
  if (!spec) {
    spec = generateFallbackSpec(prompt);
    logger.info(`Using fallback spec: ${spec.appName} (${spec.domain})`);
  }

  return renderFromSpec(spec);
}

/**
 * Generate a README.md for the app.
 */
function generateReadme(spec: AppSpec): string {
  return `# ${spec.appName}

${spec.tagline}

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- **${spec.primaryAction} ${spec.primaryEntityPlural}**: Full CRUD with search, filters, and sorting
- **Dashboard**: KPI cards with trend indicators
- **Multiple Views**: ${spec.views.join(', ')}
- **Categories**: ${spec.categories.slice(0, 4).join(', ')}, and more
- **Responsive Design**: Works on desktop and mobile
- **${spec.domain} Theme**: Domain-specific color scheme and styling

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
