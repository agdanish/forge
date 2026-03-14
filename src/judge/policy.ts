/**
 * Time-Budgeted Submission Policy.
 *
 * Governs lane selection under contest time pressure.
 * Ensures we always submit SOMETHING, even under failure.
 *
 * Policy:
 *   1. Shell fit strong + validation passes → submit shell (fastest)
 *   2. Shell weak, composer fit strong + validation passes → submit composer
 *   3. Shell/composer fail → use raw LLM
 *   4. Time budget dangerously low → submit best available artifact
 *   5. Never burn time on low-confidence perfection attempts
 */

import { logger } from '../utils/logger.js';

/** Time budget constants (milliseconds) */
export const TIME_BUDGET = {
  /** Maximum time for shell lane (including spec extraction) */
  SHELL_MAX_MS: 10_000,
  /** Maximum time for composer lane */
  COMPOSER_MAX_MS: 10_000,
  /** Maximum time for LLM generation */
  LLM_MAX_MS: 45_000,
  /** Maximum total job processing time before emergency submission */
  TOTAL_MAX_MS: 90_000,
  /** Time remaining at which we force-submit whatever we have */
  EMERGENCY_THRESHOLD_MS: 10_000,
  /** Time remaining at which we skip LLM and use best deterministic */
  SKIP_LLM_THRESHOLD_MS: 20_000,
} as const;

export interface TimeBudgetState {
  jobStartMs: number;
  /** Time elapsed since job start */
  elapsedMs: number;
  /** Time remaining under total budget */
  remainingMs: number;
  /** Whether we're in emergency territory */
  isEmergency: boolean;
  /** Whether we should skip LLM to save time */
  shouldSkipLLM: boolean;
  /** Current phase recommendation */
  recommendation: 'proceed' | 'hurry' | 'emergency_submit';
}

/**
 * Check time budget and return current state + recommendation.
 */
export function checkTimeBudget(jobStartMs: number): TimeBudgetState {
  const elapsedMs = Date.now() - jobStartMs;
  const remainingMs = TIME_BUDGET.TOTAL_MAX_MS - elapsedMs;
  const isEmergency = remainingMs <= TIME_BUDGET.EMERGENCY_THRESHOLD_MS;
  const shouldSkipLLM = remainingMs <= TIME_BUDGET.SKIP_LLM_THRESHOLD_MS;

  let recommendation: 'proceed' | 'hurry' | 'emergency_submit' = 'proceed';
  if (isEmergency) {
    recommendation = 'emergency_submit';
  } else if (shouldSkipLLM) {
    recommendation = 'hurry';
  }

  if (recommendation !== 'proceed') {
    logger.warn(`[POLICY] Time budget: ${recommendation} | Elapsed: ${elapsedMs}ms | Remaining: ${remainingMs}ms`);
  }

  return {
    jobStartMs,
    elapsedMs,
    remainingMs,
    isEmergency,
    shouldSkipLLM,
    recommendation,
  };
}

/**
 * Lane priority order under different time conditions.
 */
export function getLanePriority(timeBudget: TimeBudgetState): ('shell' | 'composer' | 'llm')[] {
  if (timeBudget.isEmergency) {
    // No time — skip everything, submit whatever exists
    return [];
  }
  if (timeBudget.shouldSkipLLM) {
    // Low time — try shell/composer only
    return ['shell', 'composer'];
  }
  // Normal — full pipeline
  return ['shell', 'composer', 'llm'];
}
