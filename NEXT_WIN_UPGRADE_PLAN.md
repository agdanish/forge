# NEXT WIN UPGRADE PLAN

## Already Implemented (preserve)
- Boilerplate pre-injection (8 files)
- processJob with retry logic (upload 3x, submit 3x)
- Emergency ZIP fallback (never text-only for build prompts)
- Deterministic validation (replaces two-pass LLM review)
- Timing instrumentation
- 14 scaffold archetypes in templates/index.ts
- Simulation matrix script
- .env tuned (tools disabled, temp 0.3)

## Still Missing (implement now)

### 1. Preflight readiness script
- scripts/preflight.ts — checks all env/config/status

### 2. Deterministic shell compiler
- src/shells/universal.ts — universal workspace shell (App.tsx template)
- src/shells/dashboard.ts — analytics dashboard shell
- src/shells/renderer.ts — spec → shell → App.tsx renderer
- src/shells/spec.ts — typed AppSpec schema + extraction prompt
- src/shells/themes.ts — 6 theme presets mapped by domain

### 3. Modify runner.ts to use shell compiler as PRIMARY path
- Classify prompt → extract spec → render shell → ZIP
- LLM tool-call generation becomes FALLBACK only

### 4. WebSocket hardening in runner.ts
- Stale detection, forced poll on connect/disconnect/error

### 5. Faster polling (2s when no WS)

### 6. Update simulation-matrix.ts for shell reporting

### 7. Update CLAUDE.md

## Implementation Order
1. Preflight script (quick win, immediate value)
2. Theme presets
3. AppSpec schema + extraction
4. Shell templates (universal + dashboard)
5. Shell renderer
6. Wire into runner.ts as primary path
7. WebSocket hardening + polling
8. Simulation update
9. CLAUDE.md update
10. TypeScript check + push

## Verification
```bash
npx tsx scripts/preflight.ts
npm run typecheck
npx tsx scripts/simulation-matrix.ts dashboard
```
