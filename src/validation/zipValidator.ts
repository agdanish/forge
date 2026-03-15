import { createReadStream } from "fs";
import { stat, readFile } from "fs/promises";
import { join } from "path";
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
export async function validateZip(zipPath: string, projectFiles: string[], projectDir?: string): Promise<ValidationResult> {
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

  // Content validation: check key files are valid
  const hasAppTsx = Array.from(fileSet).some(f => f.endsWith('App.tsx'));
  if (!hasAppTsx) {
    result.warnings.push("No App.tsx found — expected for React project");
  }

  if (projectDir && hasPackageJson) {
    try {
      const pkgContent = await readFile(join(projectDir, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);
      if (!pkg.scripts?.dev) {
        result.errors.push("package.json missing 'dev' script — app won't start");
        result.valid = false;
      }
      if (!pkg.dependencies?.react) {
        result.warnings.push("package.json missing react dependency");
      }
    } catch (e) {
      result.errors.push("package.json is invalid JSON — build will fail");
      result.valid = false;
    }
  }

  if (projectDir && hasAppTsx) {
    try {
      const appPath = Array.from(fileSet).find(f => f.endsWith('App.tsx'));
      if (appPath) {
        const appContent = await readFile(join(projectDir, appPath), 'utf-8');
        if (!/export\s+default\s+function|export\s+default\s+/i.test(appContent)) {
          result.warnings.push("App.tsx may be missing default export");
        }
        // Check for placeholder text
        for (const pat of PLACEHOLDER_PATTERNS) {
          if (pat.test(appContent)) {
            result.warnings.push(`App.tsx contains placeholder text: ${pat.source}`);
            break;
          }
        }
        // Check for empty onClick handlers
        if (/onClick=\{?\(\)\s*=>\s*\{\s*\}\}?/i.test(appContent)) {
          result.warnings.push("App.tsx has empty onClick handlers — dead buttons");
        }
      }
    } catch {
      // Non-blocking — file read failed
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
