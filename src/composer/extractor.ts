/**
 * Kit Capability Extractor — deterministic pattern matching to detect
 * which component kits a prompt needs.
 *
 * No LLM calls. Fully offline.
 */

import { KitId, KIT_PROFILES, ALL_KIT_IDS } from './kits.js';

export interface KitMatch {
  kitId: KitId;
  score: number;
  keywordHits: number;
  patternHits: number;
}

export interface KitExtractionResult {
  matches: KitMatch[];
  bestKit: KitId | null;
  bestScore: number;
  /** Whether any kit scored high enough to be viable */
  hasViableKit: boolean;
}

const MIN_VIABLE_SCORE = 6; // At least 3 keyword hits or 1 pattern + 1 keyword

export function extractKitFit(prompt: string): KitExtractionResult {
  const lower = prompt.toLowerCase();
  const matches: KitMatch[] = [];

  for (const kitId of ALL_KIT_IDS) {
    const profile = KIT_PROFILES[kitId];
    let score = 0;
    let keywordHits = 0;
    let patternHits = 0;

    // Pattern matches (stronger signal: +5 each)
    for (const pat of profile.patterns) {
      if (pat.test(prompt)) {
        patternHits++;
        score += 5;
      }
    }

    // Keyword matches (+2 each)
    for (const kw of profile.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        keywordHits++;
        score += 2;
      }
    }

    if (score > 0) {
      matches.push({ kitId, score, keywordHits, patternHits });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  const bestMatch = matches[0] || null;

  return {
    matches,
    bestKit: bestMatch && bestMatch.score >= MIN_VIABLE_SCORE ? bestMatch.kitId : null,
    bestScore: bestMatch?.score || 0,
    hasViableKit: bestMatch !== null && bestMatch.score >= MIN_VIABLE_SCORE,
  };
}
