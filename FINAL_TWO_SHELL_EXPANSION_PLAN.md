# Final Two-Shell Expansion Plan

## Current Architecture (5 shells → 7 shells)

### Existing Shells
| Shell | File | Covers |
|-------|------|--------|
| universal | src/shells/universal.ts | CRUD tools, trackers, managers |
| dashboard | src/shells/dashboard.ts | Analytics, metrics, KPIs |
| landing | src/shells/landing.ts | Showcase, marketing, startup pages |

### Existing Infrastructure
- **Spec type**: `AppSpec.shell` = `'universal' | 'dashboard' | 'landing'`
- **Routing**: Keyword-based in `generateFallbackSpec()` — dashboard priority > landing > universal
- **Domain packs**: 6 packs (startup, nonprofit, healthcare, education, operations, creator)
- **Themes**: 6 themes (neutral-dark, fintech-dark, creator-dark, health-light, education-light, neutral-light)
- **Renderer**: 3-way switch in `renderFromSpec()`
- **Tests**: 29 smoke tests, 23 weird-prompt tests

---

## New Shells

### 1. Kanban / Workflow Shell (`kanban`)
**File**: `src/shells/kanban.ts`
**Function**: `renderKanbanShell(spec: AppSpec): string`

**UI**: Stage columns (3-5), cards with priority/owner/date, top stats bar, search/filter, detail modal, move-stage buttons, column counts.

**Routing keywords**: kanban, board, pipeline, workflow, stages, hiring, triage, escalation, backlog, sprint, ticket board, outreach tracker, approval flow, production pipeline

**Priority**: Below dashboard (explicit analytics intent), above landing showcase-context. Kanban keywords checked before landing keywords.

### 2. Wizard / Intake Shell (`wizard`)
**File**: `src/shells/wizard.ts`
**Function**: `renderWizardShell(spec: AppSpec): string`

**UI**: Progress stepper (4 steps), focused inputs per step, option cards/toggles, summary/review step, result/recommendation panel, restart option.

**Routing keywords**: wizard, onboarding, intake, questionnaire, setup, step-by-step, eligibility, assessment, guided, recommendation, configure, registration, sign-up, application form

**Priority**: Below dashboard, checked alongside kanban (both before landing). Wizard keywords are distinct enough from kanban to avoid overlap.

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/shells/kanban.ts` | Kanban/workflow shell renderer |
| `src/shells/wizard.ts` | Wizard/intake shell renderer |

## Files to Modify
| File | Changes |
|------|---------|
| `src/shells/spec.ts` | Add 'kanban' and 'wizard' to shell type, add routing keywords, add entity map entries |
| `src/shells/renderer.ts` | Import + add to shell switch |
| `scripts/smoke-test.ts` | Add 10 new test cases (5 kanban, 5 wizard) |
| `scripts/weird-prompt-test.ts` | Add 6 new prompts |

## Files NOT Modified
- `src/agent/runner.ts` — no changes needed, it calls `renderFromSpec()` which handles routing
- `src/shells/universal.ts` — unchanged
- `src/shells/dashboard.ts` — unchanged
- `src/shells/landing.ts` — unchanged
- `src/shells/domainPacks.ts` — unchanged (packs already work with any shell)
- `src/shells/themes.ts` — unchanged

---

## Routing Priority (Updated)
```
1. Dashboard keywords → dashboard (explicit analytics intent)
2. Kanban keywords → kanban (process/stage intent)
3. Wizard keywords → wizard (guided/step intent)
4. Landing keywords / showcase context → landing
5. Default → universal
```

## Acceptance Criteria
- [ ] `npx tsx scripts/smoke-test.ts` — all tests pass including new ones
- [ ] `npx tsc --noEmit` — clean TypeScript compilation
- [ ] Kanban shell renders complete App.tsx with working interactions
- [ ] Wizard shell renders complete App.tsx with working interactions
- [ ] Domain packs apply content to both new shells
- [ ] No existing test breaks
- [ ] Render time stays <5ms per shell

## Verification Commands
```bash
cd D:\Seedstr\seed-agent
npx tsc --noEmit
npx tsx scripts/smoke-test.ts
npx tsx scripts/weird-prompt-test.ts
```
