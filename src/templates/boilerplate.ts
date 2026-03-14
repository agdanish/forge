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
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  .animate-fade-in-delay-1 { animation: fadeIn 0.4s ease-out 0.1s forwards; opacity: 0; }
  .animate-fade-in-delay-2 { animation: fadeIn 0.4s ease-out 0.2s forwards; opacity: 0; }
  .animate-fade-in-delay-3 { animation: fadeIn 0.4s ease-out 0.3s forwards; opacity: 0; }
}

/* Smooth scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #4b5563; }
`,
    },
  ];
}
