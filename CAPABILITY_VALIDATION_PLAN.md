# Capability Validation Plan

## Current Architecture
- Fitness gate: 3-layer scoring (archetype + semantic + hard escape)
- Shell routing: keyword-based in spec.ts (dashboard > wizard > kanban > landing > universal)
- 5 shells: universal, dashboard, landing, kanban, wizard
- Threshold: score >= 50 → shell, < 50 → LLM

## Weak Points
1. Archetype matching is category-based, not capability-based
2. A prompt can match a shell archetype but require capabilities the shell lacks
3. No structured "what does this prompt need?" extraction
4. No "can this shell actually deliver?" validation
5. Composite prompts (dashboard + map, tracker + chat) confuse keyword scoring

## Solution: Capability Validation Layer
Add between fitness gate and shell selection:
1. Extract required UI capabilities from prompt (deterministic, pattern-based)
2. Compare against shell capability profiles
3. Score compatibility, detect incompatibilities
4. Abstain to LLM if no shell covers critical capabilities

## Files to Create
- `src/shells/capabilities.ts` — taxonomy, profiles, extractor, scorer

## Files to Modify
- `src/shells/fitness.ts` — integrate capability validation into scoring
- `scripts/adversarial25-test.ts` — add capability reporting
- `scripts/capability-test.ts` — new offline test harness

## Acceptance Criteria
- All 25 adversarial prompts still route correctly
- All 69 fitness tests still pass
- All 39 smoke tests still pass
- Capability extraction produces structured output for any prompt
- Incompatible capabilities trigger abstain
- No OpenRouter/API usage
- TypeScript clean

## No External API Usage
All capability extraction and scoring is deterministic pattern matching.
Zero model calls. Zero credits consumed.
