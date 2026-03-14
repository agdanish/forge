import { createReadStream } from "fs";
import { stat, readFile } from "fs/promises";
import { logger } from "../utils/logger.js";

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/,
  /\bPLACEHOLDER\b/,
  /\bFILL_IN\b/,
  /\bYOUR_TEXT_HERE\b/,
  /\bCOMING_SOON\b/,
  /lorem ipsum/i,
];

const REQUIRED_FILES = [
  "package.json",
  "README.md",
];

const REQUIRED_SCRIPTS = ["dev"];

/**
 * Validate a generated ZIP file before submission.
 * Returns a result with errors (blocking) and warnings (non-blocking).
 */
export async function validateZip(zipPath: string, projectFiles: string[]): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, warnings: [], errors: [] };

  // Check file exists and is non-empty
  try {
    const stats = await stat(zipPath);
    if (stats.size === 0) {
      result.errors.push("ZIP file is empty");
      result.valid = false;
      return result;
    }
    if (stats.size > 64 * 1024 * 1024) {
      result.errors.push(`ZIP file too large: ${Math.round(stats.size / 1024 / 1024)}MB (max 64MB)`);
      result.valid = false;
    }
    logger.debug(`ZIP size: ${Math.round(stats.size / 1024)}KB`);
  } catch {
    result.errors.push("ZIP file not found or unreadable");
    result.valid = false;
    return result;
  }

  // Check file count sanity
  if (projectFiles.length < 3) {
    result.errors.push(`Too few files in project: ${projectFiles.length} (expected at least 3)`);
    result.valid = false;
  }
  if (projectFiles.length > 500) {
    result.warnings.push(`Unusually high file count: ${projectFiles.length}`);
  }

  // Check required files exist
  const fileSet = new Set(projectFiles.map(f => f.replace(/\\/g, "/")));
  for (const req of REQUIRED_FILES) {
    const found = Array.from(fileSet).some(f => f === req || f.endsWith(`/${req}`));
    if (!found) {
      result.errors.push(`Missing required file: ${req}`);
      result.valid = false;
    }
  }

  // Check has either package.json (React app) or index.html (static)
  const hasPackageJson = Array.from(fileSet).some(f => f === "package.json" || f.endsWith("/package.json"));
  const hasIndexHtml = Array.from(fileSet).some(f => f === "index.html" || f.endsWith("/index.html"));
  if (!hasPackageJson && !hasIndexHtml) {
    result.errors.push("Missing entry point: no package.json or index.html found");
    result.valid = false;
  }

  // Check has src/ directory (for React projects)
  if (hasPackageJson) {
    const hasSrc = Array.from(fileSet).some(f => f.startsWith("src/") || f.includes("/src/"));
    if (!hasSrc) {
      result.warnings.push("No src/ directory found — expected for React project");
    }
  }

  // Content validation: check package.json is valid JSON with dev script
  if (hasPackageJson) {
    try {
      // zipPath is the zip, but projectFiles come from the build dir — try to find package.json in the ZIP's source dir
      // We can only do content checks if we have access to the project dir (passed via projectFiles paths)
      // For now, just validate the file list includes expected React files
      const hasAppTsx = Array.from(fileSet).some(f => f.endsWith('App.tsx'));
      if (!hasAppTsx) {
        result.warnings.push("No App.tsx found — expected for React project");
      }
    } catch {
      // Non-blocking
    }
  }

  // Log summary
  if (result.errors.length > 0) {
    logger.warn(`ZIP validation failed: ${result.errors.join("; ")}`);
  } else if (result.warnings.length > 0) {
    logger.info(`ZIP validation passed with warnings: ${result.warnings.join("; ")}`);
  } else {
    logger.info(`✓ ZIP validation passed (${projectFiles.length} files, ${result.warnings.length} warnings)`);
  }

  return result;
}
