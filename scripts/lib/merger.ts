/**
 * merger.ts — Merge completed feature branches to develop.
 *
 * Responsibilities:
 *   - Merge a verified feature branch into the base branch (develop)
 *   - Handle merge conflicts gracefully
 *   - Update wave state after merge
 *
 * IMPORTANT: All operations are ASYNC — does not block the event loop.
 */

import { exec } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MergeResult {
  success: boolean;
  merged: boolean;
  error: string | null;
  commitHash: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const errMsg = stderr?.trim() || stdout?.trim() || error.message;
        reject(new Error(errMsg));
      } else {
        resolve((stdout ?? "").trim());
      }
    });
  });
}

async function runSafe(cmd: string, cwd: string): Promise<{ ok: boolean; output: string }> {
  try {
    return { ok: true, output: await run(cmd, cwd) };
  } catch (err: any) {
    return { ok: false, output: err.message || String(err) };
  }
}

// ---------------------------------------------------------------------------
// Merge Operations
// ---------------------------------------------------------------------------

/**
 * Merge a feature branch into the base branch using --no-ff.
 * Must be run from the main repo (not a worktree).
 *
 * ASYNC — does not block the event loop.
 */
export async function mergeBranch(
  projectRoot: string,
  featureBranch: string,
  baseBranch: string
): Promise<MergeResult> {
  // Ensure we're on the base branch
  const currentBranch = await run("git branch --show-current", projectRoot);
  if (currentBranch !== baseBranch) {
    const checkout = await runSafe(`git checkout "${baseBranch}"`, projectRoot);
    if (!checkout.ok) {
      return {
        success: false,
        merged: false,
        error: `Failed to checkout ${baseBranch}: ${checkout.output}`,
        commitHash: null,
      };
    }
  }

  // Pull latest (in case remote has new commits)
  await runSafe(`git pull --ff-only origin "${baseBranch}"`, projectRoot);

  // Attempt the merge
  const mergeResult = await runSafe(
    `git merge --no-ff "${featureBranch}" -m "Merge branch '${featureBranch}' into ${baseBranch}"`,
    projectRoot
  );

  if (!mergeResult.ok) {
    // Merge failed — likely conflicts
    // Abort the merge to leave repo clean
    await runSafe("git merge --abort", projectRoot);

    return {
      success: false,
      merged: false,
      error: `Merge conflict: ${mergeResult.output}`,
      commitHash: null,
    };
  }

  // Get the merge commit hash
  const commitHash = await run("git rev-parse HEAD", projectRoot);

  return {
    success: true,
    merged: true,
    error: null,
    commitHash,
  };
}

/**
 * Check if a branch can be fast-forward merged (no conflicts).
 */
export async function canMerge(
  projectRoot: string,
  featureBranch: string,
  baseBranch: string
): Promise<{ canMerge: boolean; reason: string }> {
  // Check if branch exists
  const branchExists = await runSafe(
    `git rev-parse --verify "${featureBranch}"`,
    projectRoot
  );
  if (!branchExists.ok) {
    return { canMerge: false, reason: `Branch ${featureBranch} does not exist` };
  }

  // Try a dry-run merge
  const result = await runSafe(
    `git merge-tree $(git merge-base "${baseBranch}" "${featureBranch}") "${baseBranch}" "${featureBranch}"`,
    projectRoot
  );

  // Check for conflict markers in the output
  if (result.output.includes("<<<<<<<") || result.output.includes(">>>>>>>")) {
    return { canMerge: false, reason: "Merge would result in conflicts" };
  }

  return { canMerge: true, reason: "Clean merge possible" };
}

/**
 * Merge multiple verified branches sequentially.
 * Stops on first failure.
 */
export async function mergeAll(
  projectRoot: string,
  featureBranches: string[],
  baseBranch: string
): Promise<Map<string, MergeResult>> {
  const results = new Map<string, MergeResult>();

  for (const branch of featureBranches) {
    const result = await mergeBranch(projectRoot, branch, baseBranch);
    results.set(branch, result);

    if (!result.success) {
      // Stop on first failure — remaining branches may depend on this
      break;
    }
  }

  return results;
}

/**
 * Delete a feature branch after successful merge.
 */
export async function deleteBranch(
  projectRoot: string,
  branchName: string
): Promise<boolean> {
  const result = await runSafe(`git branch -d "${branchName}"`, projectRoot);
  return result.ok;
}
