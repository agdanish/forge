/**
 * Internal Judge Proxy — deterministic pre-submit quality scoring.
 *
 * Estimates functionality, design, and speed confidence based on
 * structural signals from the generated output. No LLM calls.
 *
 * Used to:
 *   - Compare candidate outputs from different lanes
 *   - Decide whether to submit or escalate
 *   - Log confidence for post-mortem analysis
 */

import { logger } from '../utils/logger.js';

export interface JudgeScore {
  /** Estimated functionality quality (0-10) */
  functionality: number;
  /** Estimated design quality (0-10) */
  design: number;
  /** Speed estimate — lower is better (lane cost in ms estimate) */
  speedMs: number;
  /** Overall submission confidence (0-100) */
  confidence: number;
  /** Whether this passes the minimum functionality threshold (5/10) */
  passesThreshold: boolean;
  /** Lane that produced this output */
  lane: 'shell' | 'composer' | 'llm' | 'emergency';
  /** Signal breakdown for explainability */
  signals: JudgeSignal[];
}

export interface JudgeSignal {
  name: string;
  score: number;     // contribution to parent metric
  maxScore: number;
  detail?: string;
}

/**
 * Score a generated App.tsx + file list deterministically.
 * Returns a JudgeScore that estimates how well the output will
 * score against the Seed Router's Functionality/Design/Speed criteria.
 */
export function scoreOutput(opts: {
  appTsx: string;
  files: string[];
  lane: 'shell' | 'composer' | 'llm' | 'emergency';
  elapsedMs: number;
  kitId?: string;
  shellType?: string;
  repairCount?: number;
  composerScore?: number;
  fitnessScore?: number;
}): JudgeScore {
  const { appTsx, files, lane, elapsedMs } = opts;
  const signals: JudgeSignal[] = [];

  // ══════════════════════════════════════════════
  // FUNCTIONALITY SIGNALS (0-10)
  // ══════════════════════════════════════════════

  let funcScore = 0;

  // F1: Has interactive elements (buttons, inputs, selects)
  const buttonCount = (appTsx.match(/<button/g) || []).length;
  const inputCount = (appTsx.match(/<input/g) || []).length;
  const selectCount = (appTsx.match(/<select/g) || []).length;
  const interactiveTotal = buttonCount + inputCount + selectCount;
  const f1 = Math.min(interactiveTotal >= 5 ? 2 : interactiveTotal >= 2 ? 1 : 0, 2);
  funcScore += f1;
  signals.push({ name: 'interactive_elements', score: f1, maxScore: 2, detail: `${interactiveTotal} elements (${buttonCount} btn, ${inputCount} input)` });

  // F2: Has state management (useState calls)
  const stateCount = (appTsx.match(/useState/g) || []).length;
  const f2 = Math.min(stateCount >= 4 ? 2 : stateCount >= 2 ? 1 : 0, 2);
  funcScore += f2;
  signals.push({ name: 'state_management', score: f2, maxScore: 2, detail: `${stateCount} useState calls` });

  // F3: Has event handlers (onClick, onChange, onSubmit)
  const handlerCount = (appTsx.match(/on(?:Click|Change|Submit|KeyDown|KeyUp|Input|Focus|Blur)=/g) || []).length;
  const f3 = Math.min(handlerCount >= 5 ? 2 : handlerCount >= 2 ? 1 : 0, 2);
  funcScore += f3;
  signals.push({ name: 'event_handlers', score: f3, maxScore: 2, detail: `${handlerCount} handlers` });

  // F4: No placeholder/broken content
  const hasPlaceholders = /(?:coming soon|placeholder|lorem ipsum|TODO|PLACEHOLDER|FILL_IN)/i.test(appTsx);
  const hasEmptyHandlers = /onClick=\{?\(\)\s*=>\s*\{\s*\}\}?/.test(appTsx);
  const f4 = hasPlaceholders ? 0 : hasEmptyHandlers ? 1 : 2;
  funcScore += f4;
  signals.push({ name: 'no_placeholders', score: f4, maxScore: 2, detail: hasPlaceholders ? 'placeholder text found' : hasEmptyHandlers ? 'empty handlers found' : 'clean' });

  // F5: Has data/content (not empty app)
  const codeLength = appTsx.length;
  const f5 = codeLength > 5000 ? 2 : codeLength > 2000 ? 1 : 0;
  funcScore += f5;
  signals.push({ name: 'content_volume', score: f5, maxScore: 2, detail: `${codeLength} chars` });

  // ══════════════════════════════════════════════
  // DESIGN SIGNALS (0-10)
  // ══════════════════════════════════════════════

  let designScore = 0;

  // D1: Tailwind usage (styling richness)
  const tailwindClasses = (appTsx.match(/className="[^"]+"/g) || []).length;
  const d1 = Math.min(tailwindClasses >= 30 ? 2 : tailwindClasses >= 15 ? 1 : 0, 2);
  designScore += d1;
  signals.push({ name: 'tailwind_richness', score: d1, maxScore: 2, detail: `${tailwindClasses} className attributes` });

  // D2: Uses icons (lucide-react imports)
  const iconImports = (appTsx.match(/import\s*{[^}]+}\s*from\s*['"]lucide-react['"]/g) || []);
  const iconCount = iconImports.reduce((sum, imp) => sum + ((imp.match(/,/g) || []).length + 1), 0);
  const d2 = Math.min(iconCount >= 5 ? 2 : iconCount >= 2 ? 1 : 0, 2);
  designScore += d2;
  signals.push({ name: 'icon_usage', score: d2, maxScore: 2, detail: `${iconCount} icons imported` });

  // D3: Has responsive/layout classes
  const hasFlexGrid = /(?:flex|grid|gap-|space-[xy]-)/.test(appTsx);
  const hasResponsive = /(?:sm:|md:|lg:|xl:)/.test(appTsx);
  const d3 = (hasFlexGrid ? 1 : 0) + (hasResponsive ? 1 : 0);
  designScore += d3;
  signals.push({ name: 'layout_responsive', score: d3, maxScore: 2, detail: `flex/grid: ${hasFlexGrid}, responsive: ${hasResponsive}` });

  // D4: Color system (uses bg-, text-, border- with variety)
  const bgColors = new Set((appTsx.match(/bg-(?:\w+-)?(?:\d+)/g) || []).map(c => c));
  const textColors = new Set((appTsx.match(/text-(?:\w+-)?(?:\d+)/g) || []).map(c => c));
  const colorVariety = bgColors.size + textColors.size;
  const d4 = Math.min(colorVariety >= 8 ? 2 : colorVariety >= 4 ? 1 : 0, 2);
  designScore += d4;
  signals.push({ name: 'color_variety', score: d4, maxScore: 2, detail: `${bgColors.size} bg + ${textColors.size} text colors` });

  // D5: Has visual polish (rounded, shadow, transition, hover)
  const hasRounded = /rounded/.test(appTsx);
  const hasShadow = /shadow/.test(appTsx);
  const hasTransition = /transition/.test(appTsx);
  const hasHover = /hover:/.test(appTsx);
  const polishCount = [hasRounded, hasShadow, hasTransition, hasHover].filter(Boolean).length;
  const d5 = Math.min(polishCount >= 3 ? 2 : polishCount >= 1 ? 1 : 0, 2);
  designScore += d5;
  signals.push({ name: 'visual_polish', score: d5, maxScore: 2, detail: `rounded: ${hasRounded}, shadow: ${hasShadow}, transition: ${hasTransition}, hover: ${hasHover}` });

  // ══════════════════════════════════════════════
  // FILE STRUCTURE SIGNALS
  // ══════════════════════════════════════════════

  const hasReadme = files.some(f => f.toLowerCase().includes('readme'));
  const hasPackageJson = files.some(f => f === 'package.json');
  const hasAppTsx = files.some(f => f.includes('App.tsx'));
  const fileStructureOk = hasReadme && hasPackageJson && hasAppTsx;

  if (!fileStructureOk) {
    funcScore = Math.max(0, funcScore - 2);
    signals.push({ name: 'file_structure', score: -2, maxScore: 0, detail: `readme: ${hasReadme}, pkg: ${hasPackageJson}, app: ${hasAppTsx}` });
  }

  // ══════════════════════════════════════════════
  // LANE-BASED ADJUSTMENTS
  // ══════════════════════════════════════════════

  // Emergency lane penalty
  if (lane === 'emergency') {
    funcScore = Math.max(0, funcScore - 3);
    designScore = Math.max(0, designScore - 3);
    signals.push({ name: 'emergency_penalty', score: -3, maxScore: 0, detail: 'Emergency lane used' });
  }

  // Repair penalty (mild — repairs are good but signal underlying issues)
  if (opts.repairCount && opts.repairCount > 0) {
    funcScore = Math.max(0, funcScore - 0.5);
    signals.push({ name: 'repair_penalty', score: -0.5, maxScore: 0, detail: `${opts.repairCount} repairs applied` });
  }

  // ══════════════════════════════════════════════
  // FINAL SCORING
  // ══════════════════════════════════════════════

  funcScore = Math.min(10, Math.max(0, funcScore));
  designScore = Math.min(10, Math.max(0, designScore));

  // Speed: shell < composer < llm < emergency
  const speedMs = elapsedMs;

  // Overall confidence: weighted combination
  const confidence = Math.round(
    (funcScore / 10 * 50) +      // 50% weight on functionality
    (designScore / 10 * 30) +    // 30% weight on design
    (Math.max(0, 1 - speedMs / 60000) * 20) // 20% weight on speed (under 60s)
  );

  const passesThreshold = funcScore >= 5;

  const result: JudgeScore = {
    functionality: Math.round(funcScore * 10) / 10,
    design: Math.round(designScore * 10) / 10,
    speedMs,
    confidence,
    passesThreshold,
    lane,
    signals,
  };

  logger.info(`[JUDGE] Lane: ${lane} | Func: ${result.functionality}/10 | Design: ${result.design}/10 | Speed: ${speedMs}ms | Confidence: ${confidence}/100 | Pass: ${passesThreshold}`);

  return result;
}

/**
 * Compare two JudgeScores and return which is better.
 * Returns 'a' or 'b'.
 */
export function compareCandidates(a: JudgeScore, b: JudgeScore): 'a' | 'b' {
  // If only one passes threshold, pick it
  if (a.passesThreshold && !b.passesThreshold) return 'a';
  if (!a.passesThreshold && b.passesThreshold) return 'b';

  // Both pass (or both fail) → compare confidence
  if (a.confidence !== b.confidence) {
    return a.confidence > b.confidence ? 'a' : 'b';
  }

  // Tie → prefer faster lane
  return a.speedMs <= b.speedMs ? 'a' : 'b';
}
