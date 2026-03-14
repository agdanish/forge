# MASTER MAX-WIN PLAN — FORGE Seedstr Hackathon Agent

**Date**: 2026-03-14 | **Deadline**: 2026-03-15 19:30 | **Status**: IMPLEMENTING

---

## CURRENT ARCHITECTURE SUMMARY

### 3-Lane Routing (COMPLETE)
```
Prompt → checkShellFitness() → score 0-100
  IF score >= 50 → SHELL LANE (5 shells: universal, dashboard, landing, kanban, wizard)
  ELIF composer.canCompose() → COMPOSER LANE (6 kits: chat-inbox, feed-social, store-catalog, map-splitview, media-player, editor-lite)
  ELSE → RAW LLM LANE (Claude Sonnet 4.6 via OpenRouter)
  IF all fail → EMERGENCY ZIP
```

### Files & Components
| Component | File | Status |
|-----------|------|--------|
| Fitness Gate | `src/shells/fitness.ts` | ✅ 3-layer scoring (archetype + semantic + escape) |
| Shell Renderer | `src/shells/renderer.ts` | ✅ Spec extraction → shell selection → render |
| Composer | `src/composer/composer.ts` | ✅ Kit selection → deterministic render |
| Kit Profiles | `src/composer/kits.ts` | ✅ 6 kits with capability taxonomy |
| Kit Scorer | `src/composer/scorer.ts` | ✅ Single + multi-kit composition scoring |
| Kit Extractor | `src/composer/extractor.ts` | ✅ Pattern + keyword extraction |
| Repair Controller | `src/composer/repair.ts` | ⚠️ EXISTS but NOT integrated into pipeline |
| Runner | `src/agent/runner.ts` | ✅ Shell→Composer→LLM fallback chain |
| ZIP Validator | `src/validation/zipValidator.ts` | ✅ Pre-submission validation |
| Browser Validation | `scripts/composer-browser-test.ts` | ✅ Playwright + Vite for all 6 kits |

### Test Coverage
| Suite | Count | Status |
|-------|-------|--------|
| Smoke | 39 | ✅ |
| Fitness | 69 | ✅ |
| Adversarial 25 | 25 | ✅ |
| Capability | 19 | ✅ |
| Weird Prompt | 29 | ✅ |
| Composer | 54 | ✅ |
| Browser Validation | 6 | ✅ |
| **Total** | **241** | **✅** |

---

## WEAKNESSES THAT STILL REMAIN

1. **Repair controller exists but is NOT called** — `repair.ts` has 8 checks but `composer.ts` never invokes it
2. **No internal judge proxy** — no pre-submit quality scoring to compare lanes
3. **No time-budgeted submission policy** — no explicit timeout or lane preference under pressure
4. **No master regression test** — individual suites exist but no single "validate everything" script
5. **No lane-escalation after repair** — if composer output is weak, no automatic escalation to LLM

---

## INTEGRATION POINTS

1. `src/composer/composer.ts` line 60 — after `renderer(spec)`, run repair
2. `src/agent/runner.ts` line 598 — after shell/composer ZIP creation, run judge proxy
3. `src/agent/runner.ts` line 567 — add time budget enforcement
4. New `src/judge/proxy.ts` — deterministic pre-submit scoring
5. New `scripts/master-test.ts` — runs all suites, generates unified report

---

## ACCEPTANCE CRITERIA

- [ ] Repair controller integrated into composer pipeline
- [ ] Internal judge proxy exists and scores shell/composer/LLM outputs
- [ ] Time budget policy exists in runner
- [ ] Master regression test runs all suites offline
- [ ] All 241+ tests still pass
- [ ] TypeScript compiles clean
- [ ] No OpenRouter/API calls during testing
- [ ] Shell-fit speed preserved

---

## THINGS INTENTIONALLY NOT CHANGED (stability preservation)

- Shell renderers (universal, dashboard, landing, kanban, wizard) — working correctly
- API client (src/api/client.ts) — proven platform integration
- LLM client (src/llm/client.ts) — working OpenRouter integration
- WebSocket + polling logic — proven job detection
- Emergency ZIP fallback — last-resort safety net
- ZIP packaging and upload retry logic
- HACKATHON_SYSTEM_PROMPT — already optimized
- Domain packs and themes — proven variety system
- Configuration and env vars — deployment-ready

---

## VERIFICATION COMMANDS (all offline, no API)

```bash
npx tsx scripts/smoke-test.ts        # 39 tests
npx tsx scripts/fitness-test.ts      # 69 tests
npx tsx scripts/adversarial25-test.ts # 25 tests
npx tsx scripts/capability-test.ts   # 19 tests
npx tsx scripts/weird-prompt-test.ts # 29 tests
npx tsx scripts/composer-test.ts     # 54 tests
npx tsx scripts/master-test.ts       # All suites + judge proxy + reports
```

**⚠️ OpenRouter/API usage is FORBIDDEN during testing and hardening.**
