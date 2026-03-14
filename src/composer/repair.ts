/**
 * Bounded Repair/Fallback Controller for Composer Lane.
 *
 * When a composed kit output has known issues (missing default state,
 * broken imports, empty containers), this module applies ONE deterministic
 * repair pass. If repair fails or the issue is unknown, it signals
 * escalation to LLM lane.
 *
 * Design principles:
 *   - ONE repair attempt only (no infinite loops)
 *   - Deterministic string transforms (no LLM needed)
 *   - Fast — must complete in <50ms
 *   - If unsure, escalate (never produce broken output)
 */

import { logger } from '../utils/logger.js';

export interface RepairDiagnosis {
  /** What issue was detected */
  issue: string;
  /** Category of the issue */
  category: 'missing_state' | 'empty_container' | 'broken_import' | 'missing_handler' | 'style_issue' | 'unknown';
  /** Whether repair was attempted */
  repaired: boolean;
  /** Whether to escalate to LLM */
  shouldEscalate: boolean;
}

export interface RepairResult {
  /** The (possibly repaired) App.tsx content */
  appTsx: string;
  /** All diagnoses found */
  diagnoses: RepairDiagnosis[];
  /** Whether any repair was applied */
  wasRepaired: boolean;
  /** Whether the output should be escalated to LLM */
  shouldEscalate: boolean;
}

/**
 * Run bounded repair on composed App.tsx output.
 * Applies at most ONE repair pass with deterministic transforms.
 */
export function repairComposedOutput(appTsx: string): RepairResult {
  const diagnoses: RepairDiagnosis[] = [];
  let repaired = appTsx;
  let anyRepaired = false;

  // ── CHECK 1: Missing useState import ──
  if (repaired.includes('useState') && !repaired.includes("from 'react'") && !repaired.includes('from "react"')) {
    repaired = `import { useState } from 'react';\n` + repaired;
    diagnoses.push({
      issue: 'useState used but React import missing',
      category: 'broken_import',
      repaired: true,
      shouldEscalate: false,
    });
    anyRepaired = true;
  }

  // ── CHECK 2: Missing useEffect import when used ──
  if (repaired.includes('useEffect') && !repaired.match(/import\s+{[^}]*useEffect[^}]*}\s+from\s+['"]react['"]/)) {
    // Add useEffect to existing React import
    repaired = repaired.replace(
      /import\s+{\s*([^}]+)\s*}\s+from\s+['"]react['"]/,
      (match, imports) => {
        if (!imports.includes('useEffect')) {
          return `import { ${imports.trim()}, useEffect } from 'react'`;
        }
        return match;
      }
    );
    diagnoses.push({
      issue: 'useEffect used but not imported',
      category: 'broken_import',
      repaired: true,
      shouldEscalate: false,
    });
    anyRepaired = true;
  }

  // ── CHECK 3: Empty default export ──
  if (repaired.match(/export\s+default\s+function\s+App\s*\(\)\s*{\s*return\s*\(\s*\)\s*;?\s*}/)) {
    diagnoses.push({
      issue: 'Empty App component — no JSX returned',
      category: 'empty_container',
      repaired: false,
      shouldEscalate: true,
    });
  }

  // ── CHECK 4: Missing active tab/view default ──
  // Pattern: useState<string>('') where it should have a default tab
  const emptyStringStates = repaired.match(/useState(?:<[^>]+>)?\s*\(\s*['"]\s*['"]\s*\)/g);
  if (emptyStringStates && emptyStringStates.length > 0) {
    // Check if any of these are likely view/tab states
    const viewStatePattern = /const\s+\[\s*(active\w*|selected\w*|current\w*|view\w*|tab\w*|mode\w*)\s*,/g;
    let match: RegExpExecArray | null;
    while ((match = viewStatePattern.exec(repaired)) !== null) {
      const varName = match[1];
      // Check if this variable's useState has empty string
      const stateInitPattern = new RegExp(
        `const\\s+\\[\\s*${varName}\\s*,\\s*set\\w+\\s*\\]\\s*=\\s*useState(?:<[^>]+>)?\\s*\\(\\s*['"]\\s*['"]\\s*\\)`
      );
      if (stateInitPattern.test(repaired)) {
        diagnoses.push({
          issue: `State "${varName}" initialized to empty string — may need a default value`,
          category: 'missing_state',
          repaired: false,
          shouldEscalate: false, // Not fatal, just a warning
        });
      }
    }
  }

  // ── CHECK 5: Lucide icon imports that don't exist ──
  const lucideImportMatch = repaired.match(/import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/);
  if (lucideImportMatch) {
    const importedIcons = lucideImportMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    // Common valid lucide icons (subset — we can't know all, but catch obvious typos)
    const knownBadIcons = ['Dashboard', 'Setting', 'Profile', 'Cart', 'Close'];
    const corrections: Record<string, string> = {
      'Dashboard': 'LayoutDashboard',
      'Setting': 'Settings',
      'Profile': 'User',
      'Cart': 'ShoppingCart',
      'Close': 'X',
    };
    for (const icon of importedIcons) {
      if (corrections[icon]) {
        repaired = repaired.replace(
          new RegExp(`\\b${icon}\\b`, 'g'),
          corrections[icon]
        );
        diagnoses.push({
          issue: `Lucide icon "${icon}" doesn't exist, replaced with "${corrections[icon]}"`,
          category: 'broken_import',
          repaired: true,
          shouldEscalate: false,
        });
        anyRepaired = true;
      }
    }
  }

  // ── CHECK 6: onClick handler references undefined function ──
  const onClickHandlers = repaired.match(/onClick=\{(\w+)\}/g) || [];
  for (const handler of onClickHandlers) {
    const fnMatch = handler.match(/onClick=\{(\w+)\}/);
    if (!fnMatch) continue;
    const fnName = fnMatch[1];
    // Skip arrow functions, setState calls, and common React patterns
    if (fnName.startsWith('set') || fnName === 'undefined' || fnName === 'null') continue;
    // Check if this function is defined
    const fnDefPattern = new RegExp(
      `(?:const|let|function)\\s+${fnName}\\s*[=(]`
    );
    if (!fnDefPattern.test(repaired)) {
      diagnoses.push({
        issue: `onClick references "${fnName}" but no definition found`,
        category: 'missing_handler',
        repaired: false,
        shouldEscalate: false, // Not always fatal — could be prop
      });
    }
  }

  // ── CHECK 7: Completely empty component body ──
  if (repaired.match(/return\s*\(\s*<div>\s*<\/div>\s*\)/)) {
    diagnoses.push({
      issue: 'Component returns empty <div></div>',
      category: 'empty_container',
      repaired: false,
      shouldEscalate: true,
    });
  }

  // ── CHECK 8: Missing Tailwind classes in what should be a styled app ──
  const hasTailwind = /className="[^"]*(?:flex|grid|bg-|text-|p-|m-|rounded|shadow)/.test(repaired);
  if (!hasTailwind && repaired.length > 500) {
    diagnoses.push({
      issue: 'No Tailwind CSS classes detected — app may be unstyled',
      category: 'style_issue',
      repaired: false,
      shouldEscalate: false,
    });
  }

  // Determine escalation
  const shouldEscalate = diagnoses.some(d => d.shouldEscalate);

  if (diagnoses.length > 0) {
    logger.info(`[REPAIR] Found ${diagnoses.length} issues, repaired: ${anyRepaired}, escalate: ${shouldEscalate}`);
    for (const d of diagnoses) {
      logger.info(`  [${d.category}] ${d.issue} (repaired: ${d.repaired})`);
    }
  }

  return {
    appTsx: repaired,
    diagnoses,
    wasRepaired: anyRepaired,
    shouldEscalate,
  };
}
