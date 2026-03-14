# Component Composer Master Plan

## Current Architecture Summary
- **5 shells**: universal, dashboard, landing, kanban, wizard
- **4-layer fitness gate**: archetype → semantic → hard-escape → capability validation
- **Routing**: score ≥50 → shell, <50 → LLM
- **Fallback chain**: shell → fallback spec → LLM tool-call → emergency ZIP
- **20 incompatible capabilities** force LLM (chat, cart, media, canvas, map, etc.)

## Problem
Prompts with incompatible capabilities go directly to raw LLM ($0.50, 30s, fragile).
Many of these fall into **known interaction families** that could be served deterministically.

## Solution: 3-Lane Architecture
```
Prompt → fitness gate
  → Lane 1: Shell (score ≥50, shell-friendly caps)
  → Lane 2: Composer (score <50, but matches kit family)
  → Lane 3: Raw LLM (neither shell nor kit fits)
```

## Integration Points
| File | Change |
|------|--------|
| `src/shells/fitness.ts` | Add 'composer' recommendation + kit scoring |
| `src/shells/renderer.ts` | Add composer rendering path |
| `src/shells/capabilities.ts` | Extend with kit-compatible capability set |
| `src/agent/runner.ts` | Add composer lane in processJob |
| `src/composer/kits.ts` | NEW — 6 kit definitions + profiles |
| `src/composer/extractor.ts` | NEW — kit capability extraction |
| `src/composer/scorer.ts` | NEW — kit compatibility scoring |
| `src/composer/composer.ts` | NEW — deterministic app assembly |
| `src/composer/renderers/*.ts` | NEW — 6 kit renderers |
| `src/composer/repair.ts` | NEW — bounded repair controller |

## 6 Component Kits
1. **chat-inbox** — support inbox, messaging workspace, threaded conversations
2. **feed-social** — community feed, post stream, discussion
3. **store-catalog** — e-commerce, ordering, product catalog, cart
4. **map-splitview** — booking, discovery, route, map/list split
5. **media-player** — music/video player, playlist, timeline
6. **editor-lite** — poster designer, wireframe, whiteboard-lite

## Files to Create
- `src/composer/kits.ts`
- `src/composer/extractor.ts`
- `src/composer/scorer.ts`
- `src/composer/composer.ts`
- `src/composer/renderers/chat-inbox.ts`
- `src/composer/renderers/feed-social.ts`
- `src/composer/renderers/store-catalog.ts`
- `src/composer/renderers/map-splitview.ts`
- `src/composer/renderers/media-player.ts`
- `src/composer/renderers/editor-lite.ts`
- `src/composer/repair.ts`
- `scripts/composer-test.ts`
- `scripts/composer-browser-test.ts`
- `scripts/fixtures/composer-fixtures.ts`

## Acceptance Criteria
- All 6 kits render valid React apps
- Kit routing catches prompts that shells reject
- Shell lane speed unaffected
- All existing tests still pass
- Composer browser validation passes
- No OpenRouter/API usage during testing
- TypeScript compiles clean

## Verification Commands
```bash
npx tsc --noEmit
npx tsx scripts/smoke-test.ts
npx tsx scripts/fitness-test.ts
npx tsx scripts/adversarial25-test.ts
npx tsx scripts/capability-test.ts
npx tsx scripts/composer-test.ts
npx tsx scripts/composer-browser-test.ts
```

## No External API Usage
All kit extraction, scoring, composition, and validation is deterministic.
Zero model calls. Zero credits consumed during testing.
