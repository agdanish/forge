/**
 * Kit Compatibility Scorer — evaluates kit composition fitness.
 *
 * Determines if a single kit or safe multi-kit composition can serve a prompt.
 * Abstains if fit is too poor → routes to raw LLM.
 */

import { KitId, KIT_PROFILES, getCompositionSafety } from './kits.js';
import { extractKitFit, type KitExtractionResult, type KitMatch } from './extractor.js';

export interface ComposerScoreResult {
  extraction: KitExtractionResult;
  /** Best single or composed kit selection */
  selectedKits: KitId[];
  /** Overall composition confidence (0-100) */
  compositionScore: number;
  /** Capabilities the prompt asks for that kits don't cover */
  missingCapabilities: string[];
  /** Why this decision was made */
  decisiveReason: string;
  /** Whether composer should abstain → route to LLM */
  shouldAbstain: boolean;
  /** Explanation for logs */
  explanation: string;
}

const COMPOSER_THRESHOLD = 8;    // Min score to accept single kit
const MULTI_KIT_THRESHOLD = 14;  // Min combined score for multi-kit

export function scoreKitComposition(prompt: string): ComposerScoreResult {
  const extraction = extractKitFit(prompt);

  // No viable kit at all → abstain
  if (!extraction.hasViableKit || !extraction.bestKit) {
    return {
      extraction,
      selectedKits: [],
      compositionScore: 0,
      missingCapabilities: [],
      decisiveReason: 'No kit matched above threshold',
      shouldAbstain: true,
      explanation: `No viable kit (best score: ${extraction.bestScore})`,
    };
  }

  if (extraction.matches.length === 0) {
    return {
      extraction,
      selectedKits: [],
      compositionScore: 0,
      missingCapabilities: [],
      decisiveReason: 'Viable kit flagged but matches array empty',
      shouldAbstain: true,
      explanation: `Inconsistent state: hasViableKit=true but no matches`,
    };
  }

  const bestMatch = extraction.matches[0];

  // Strong single-kit match → use it
  if (bestMatch.score >= COMPOSER_THRESHOLD) {
    return {
      extraction,
      selectedKits: [bestMatch.kitId],
      compositionScore: Math.min(bestMatch.score * 5, 100),
      missingCapabilities: [],
      decisiveReason: `Strong single-kit match: ${bestMatch.kitId} (score: ${bestMatch.score})`,
      shouldAbstain: false,
      explanation: `Kit: ${bestMatch.kitId} | Score: ${bestMatch.score} | Patterns: ${bestMatch.patternHits} | Keywords: ${bestMatch.keywordHits}`,
    };
  }

  // Weak single-kit → check multi-kit composition
  if (extraction.matches.length >= 2) {
    const second = extraction.matches[1];
    const combined = bestMatch.score + second.score;

    if (combined >= MULTI_KIT_THRESHOLD) {
      const safety = getCompositionSafety(bestMatch.kitId, second.kitId);

      if (safety === 'safe') {
        return {
          extraction,
          selectedKits: [bestMatch.kitId, second.kitId],
          compositionScore: Math.min(combined * 3, 100),
          missingCapabilities: [],
          decisiveReason: `Safe multi-kit: ${bestMatch.kitId} + ${second.kitId}`,
          shouldAbstain: false,
          explanation: `Kits: ${bestMatch.kitId} + ${second.kitId} | Combined: ${combined} | Safety: safe`,
        };
      }

      if (safety === 'risky') {
        // Risky multi-kit: use strongest single kit only
        return {
          extraction,
          selectedKits: [bestMatch.kitId],
          compositionScore: Math.min(bestMatch.score * 4, 80),
          missingCapabilities: [],
          decisiveReason: `Risky multi-kit → single kit: ${bestMatch.kitId}`,
          shouldAbstain: false,
          explanation: `Kit: ${bestMatch.kitId} (${second.kitId} too risky to combine)`,
        };
      }

      // Incompatible → single kit
    }
  }

  // Weak match but above minimum → use single kit
  if (bestMatch.score >= COMPOSER_THRESHOLD - 2) {
    return {
      extraction,
      selectedKits: [bestMatch.kitId],
      compositionScore: Math.min(bestMatch.score * 4, 70),
      missingCapabilities: [],
      decisiveReason: `Marginal single-kit: ${bestMatch.kitId}`,
      shouldAbstain: false,
      explanation: `Kit: ${bestMatch.kitId} | Score: ${bestMatch.score} (marginal)`,
    };
  }

  // Below threshold → abstain
  return {
    extraction,
    selectedKits: [],
    compositionScore: bestMatch.score * 3,
    missingCapabilities: [],
    decisiveReason: `Best kit score too low: ${bestMatch.kitId} (${bestMatch.score})`,
    shouldAbstain: true,
    explanation: `No kit viable (best: ${bestMatch.kitId} at ${bestMatch.score})`,
  };
}
