# HACKATHON WIN PLAN — FORGE Agent

## FATAL FLAWS (must fix immediately)

### F1. Boilerplate lost on LLM retry
`client.ts:355` — `activeProjectBuilder = null;` during retry loop destroys pre-injected boilerplate.
On retry, the LLM generates App.tsx + README.md but package.json/vite.config/etc. are GONE.
Result: broken ZIP with 2 files instead of 10. **Contest loss.**

### F2. Text-only fallback on ZIP validation failure
`runner.ts:646-650` — If ZIP validation fails, submits text-only response.
For a build-prompt hackathon, text-only = zero functionality score = **contest loss.**
Must submit emergency ZIP instead.

### F3. Text-only fallback on upload failure
`runner.ts:665-669` — If file upload fails, submits text-only response.
Same problem. Must retry upload, then emergency ZIP if all retries fail.

### F4. No retry on upload or submit
Single attempt for both. Network hiccup = **contest loss.**

### F5. Two-pass code review burns $0.50 + 30-60s
`runner.ts:631-640` — Second LLM call after generation.
Costs extra tokens AND adds 30-60 seconds. In a speed-scored hackathon, this is devastating.
Replace with deterministic validation.

### F6. Unnecessary tools waste tokens
web_search, calculator, code_analysis are enabled but irrelevant.
Each tool definition adds ~200 tokens to every prompt. Wastes money and attention.

### F7. No timing instrumentation
Cannot measure detect-to-submit latency. Cannot optimize what you can't measure.

### F8. PUSHER_KEY is empty in .env
WebSocket won't connect. Agent falls back to polling. Up to 30s detection delay.

## IMPLEMENTATION ORDER (highest leverage first)

### Phase 1: Fix Fatal Flaws (reliability)
1. Fix boilerplate re-injection on retry (F1)
2. Add upload retry with exponential backoff (F3, F4)
3. Add submit retry (F4)
4. Build emergency ZIP fallback (F2, F3)
5. Remove two-pass review, replace with deterministic checks (F5)
6. Add timing instrumentation to processJob (F7)

### Phase 2: Speed Optimization
7. Disable unnecessary tools for hackathon (F6)
8. Trim system prompt (reduce token waste)
9. Build deterministic shell templates (3 shells + universal fallback)
10. Build spec extraction pipeline (structured LLM output)
11. Build template renderer (spec → App.tsx)

### Phase 3: Reliability Hardening
12. WebSocket stale detection + immediate poll on disconnect (F8)
13. Startup health validation
14. Emergency fallback chain

### Phase 4: Testing
15. Simulation matrix (12 diverse prompts)
16. Timing benchmarks

## ACCEPTANCE CRITERIA
- [ ] On retry, boilerplate files preserved
- [ ] Upload retried 3x before giving up
- [ ] Submit retried 3x before giving up
- [ ] Never submits text-only for build prompts (emergency ZIP instead)
- [ ] No two-pass LLM review (deterministic validation only)
- [ ] Timing logged for every stage
- [ ] Simulation matrix passes 90%+ of prompts
- [ ] Average latency < 120s

## VERIFICATION
```bash
npx tsx scripts/test-simulate.ts        # single prompt test
npx tsx scripts/simulation-matrix.ts    # multi-prompt benchmark
npm run typecheck                        # TS compilation
```
