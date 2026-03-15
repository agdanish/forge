/**
 * Pre-baked boilerplate files that are injected BEFORE LLM generation.
 * This saves 8 tool calls — the LLM only needs to create App.tsx + README.md.
 * Speed gain: ~10 tool calls → ~3 tool calls = ~3x faster generation.
 */

export interface BoilerplateFile {
  path: string;
  content: string;
}

export function getBoilerplateFiles(): BoilerplateFile[] {
  return [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'aerofyta-app',
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc -b && vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
          'lucide-react': '^0.460.0',
          recharts: '^2.15.0',
        },
        devDependencies: {
          '@types/react': '^18.3.12',
          '@types/react-dom': '^18.3.1',
          '@vitejs/plugin-react': '^4.3.4',
          autoprefixer: '^10.4.20',
          postcss: '^8.4.47',
          tailwindcss: '^3.4.15',
          typescript: '^5.6.2',
          vite: '^6.0.1',
        },
      }, null, 2),
    },
    {
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
`,
    },
    {
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
`,
    },
    {
      path: 'postcss.config.js',
      content: `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
`,
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          isolatedModules: true,
          moduleDetection: 'force',
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
      }, null, 2),
    },
    {
      path: 'index.html',
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
    {
      path: 'src/main.tsx',
      content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
`,
    },
    {
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  /* Entrance animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
  .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
  .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; opacity: 0; }
  .animate-fade-in-delay-1 { animation: fadeIn 0.4s ease-out 0.1s forwards; opacity: 0; }
  .animate-fade-in-delay-2 { animation: fadeIn 0.4s ease-out 0.2s forwards; opacity: 0; }
  .animate-fade-in-delay-3 { animation: fadeIn 0.4s ease-out 0.3s forwards; opacity: 0; }
  .animate-fade-in-delay-4 { animation: fadeIn 0.4s ease-out 0.4s forwards; opacity: 0; }
  .animate-fade-in-delay-5 { animation: fadeIn 0.4s ease-out 0.5s forwards; opacity: 0; }

  /* Card hover glow */
  .card-hover {
    transition: transform 0.2s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  }
  .card-hover:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3);
    border-color: rgba(99, 102, 241, 0.3);
  }
  .card-hover:active {
    transform: translateY(0) scale(0.995);
  }

  /* Glassmorphism */
  .glass {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* Smooth progress bars */
  .progress-smooth {
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Shimmer skeleton loading */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .animate-shimmer {
    background: linear-gradient(90deg, transparent 25%, rgba(99, 102, 241, 0.08) 50%, transparent 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* Pulse glow for notifications */
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
    50% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
  }
  .animate-pulse-glow {
    animation: pulseGlow 2s ease-in-out infinite;
  }

  /* Number counter tick */
  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-count { animation: countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
}

/* Smooth scrollbar */
html { scroll-behavior: smooth; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #4b5563; }

/* Selection color */
::selection { background: rgba(99, 102, 241, 0.3); }
`,
    },
    {
      path: 'README.md',
      content: `# App

Interactive web application built with React 18 + TypeScript + Tailwind CSS.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- [x] Interactive dashboard with real-time data visualization (recharts)
- [x] Full CRUD operations — Create, Read, Update, Delete with confirmation
- [x] Real-time search with text highlighting
- [x] Multi-criteria filtering and sorting
- [x] Data persistence via localStorage (survives page refresh)
- [x] Export to CSV file download
- [x] Keyboard shortcuts (Ctrl+K to search, Esc to close modals)
- [x] Undo on delete with toast notification
- [x] Animated KPI counters (count-up from zero)
- [x] Loading skeleton shimmer on initial render
- [x] Responsive design — works on mobile, tablet, and desktop
- [x] Dark premium theme with glassmorphism effects
- [x] Accessibility attributes (aria-labels on interactive elements)
- [x] Empty states with helpful messages and action buttons

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework with hooks |
| TypeScript | Type-safe development |
| Vite | Fast dev server + optimized builds |
| Tailwind CSS | Utility-first styling |
| Lucide React | Beautiful SVG icons |
| Recharts | Data visualization charts |

## Project Structure

\`\`\`
src/
  App.tsx      — Main application (all components, state, and logic)
  main.tsx     — React entry point
  index.css    — Tailwind imports + custom animations
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
`,
    },
  ];
}
