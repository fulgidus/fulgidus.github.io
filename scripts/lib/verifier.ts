/**
 * verifier.ts — Build verification in worktrees.
 *
 * Responsibilities:
 *   - Run the project build command in a worktree
 *   - Capture and parse build output
 *   - Determine pass/fail
 *   - Extract error messages for retry prompts
 *
 * IMPORTANT: runBuild is ASYNC — does not block the event loop.
 * This is critical because builds can take minutes and blocking
 * would freeze the TUI dashboard.
 */

import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildResult {
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Combined output, truncated for use in retry prompts */
  errorSummary: string;
  /** Duration in milliseconds */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Build Verification
// ---------------------------------------------------------------------------

const BUILD_COMMAND = "bun run build";
const BUILD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Run the build command in a worktree directory.
 * Returns structured build results.
 *
 * ASYNC — does not block the event loop.
 */
export function runBuild(worktreePath: string): Promise<BuildResult> {
  return new Promise((resolve) => {
    const start = Date.now();

    exec(
      BUILD_COMMAND,
      {
        cwd: worktreePath,
        encoding: "utf-8",
        timeout: BUILD_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - start;
        const exitCode = error ? (error as any).code ?? 1 : 0;
        const passed = !error;

        let errorSummary = "";
        if (!passed) {
          errorSummary = extractErrorSummary(stdout ?? "", stderr ?? "");
        }

        resolve({
          passed,
          exitCode,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          errorSummary,
          durationMs,
        });
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Error Extraction
// ---------------------------------------------------------------------------

/**
 * Extract a concise error summary from build output.
 * Focuses on actual error messages, not warnings or info lines.
 */
function extractErrorSummary(stdout: string, stderr: string): string {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");

  const errorLines: string[] = [];
  let capturing = false;
  let contextLines = 0;

  for (const line of lines) {
    const isError =
      /error/i.test(line) &&
      !/warning/i.test(line) &&
      !/^info/i.test(line);
    const isTypeError = /TS\d+/.test(line);
    const isAstroError = /\[astro\]/.test(line) && /error/i.test(line);

    if (isError || isTypeError || isAstroError) {
      capturing = true;
      contextLines = 0;
      errorLines.push(line);
    } else if (capturing) {
      contextLines++;
      if (contextLines <= 3) {
        errorLines.push(line);
      } else {
        capturing = false;
      }
    }
  }

  if (errorLines.length === 0) {
    // No specific errors found — return last 50 lines
    const tail = lines.slice(-50).join("\n");
    return truncate(tail, 4000);
  }

  return truncate(errorLines.join("\n"), 4000);
}

/**
 * Truncate a string to maxLen characters, adding a note if truncated.
 */
function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "\n\n[... truncated, showing first 4000 chars]";
}

// ---------------------------------------------------------------------------
// Quick Check
// ---------------------------------------------------------------------------

/**
 * Quick check if the build artifacts exist (dist/ directory).
 */
export function hasBuildArtifacts(worktreePath: string): boolean {
  try {
    return existsSync(resolve(worktreePath, "dist"));
  } catch {
    return false;
  }
}
