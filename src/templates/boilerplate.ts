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

- Interactive dashboard with real-time data
- Search, filter, and sort functionality
- Add/Edit/Delete operations
- Responsive design (mobile + desktop)
- Dark premium theme with glassmorphism effects

## Tech Stack

- React 18 + TypeScript
- Vite (fast dev server + build)
- Tailwind CSS (utility-first styling)
- Lucide React (icons)
- Recharts (data visualization)

## Build

\`\`\`bash
npm run build
\`\`\`
`,
    },
  ];
}
