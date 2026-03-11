/**
 * worktree.ts — Git worktree lifecycle management.
 *
 * Responsibilities:
 *   - Create feature branches from a base branch
 *   - Create git worktrees for each feature branch
 *   - Run `bun install` in worktrees
 *   - List and remove worktrees
 *   - Copy .opencode config into worktrees
 *
 * IMPORTANT: Heavy operations (createWorktree, installDeps) are async
 * to allow true parallelism with Promise.all. The old execSync approach
 * blocked the event loop and made Promise.all sequential.
 */

import { exec, execSync } from "node:child_process";
import { existsSync, cpSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  bare: boolean;
}

// ---------------------------------------------------------------------------
// Diagnostic Logger
// ---------------------------------------------------------------------------

function ts(): string {
  return new Date().toISOString().slice(11, 19); // HH:MM:SS
}

export function log(featureId: string, msg: string): void {
  console.log(`  [${ts()}] ${featureId}: ${msg}`);
}

// ---------------------------------------------------------------------------
// Async Command Runner
// ---------------------------------------------------------------------------

/**
 * Run a command asynchronously. Returns stdout on success, throws on failure.
 * This does NOT block the event loop, so Promise.all actually parallelizes.
 */
function runAsync(
  cmd: string,
  opts?: { cwd?: string; timeoutMs?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = exec(
      cmd,
      {
        cwd: opts?.cwd,
        encoding: "utf-8",
        timeout: opts?.timeoutMs ?? 0,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      },
      (error, stdout, stderr) => {
        if (error) {
          const errMsg = stderr?.trim() || stdout?.trim() || error.message;
          reject(new Error(`Command failed: ${cmd}\n${errMsg}`));
        } else {
          resolve((stdout ?? "").trim());
        }
      }
    );
  });
}

/**
 * Synchronous run — only for quick, non-blocking operations
 * (branch listing, worktree list, prune, etc.)
 */
function runSync(
  cmd: string,
  opts?: { cwd?: string; silent?: boolean; timeoutMs?: number }
): string {
  try {
    return execSync(cmd, {
      cwd: opts?.cwd,
      encoding: "utf-8",
      stdio: opts?.silent ? "pipe" : ["pipe", "pipe", "pipe"],
      timeout: opts?.timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() || "";
    const stdout = err.stdout?.toString().trim() || "";
    throw new Error(
      `Command failed: ${cmd}\n${stderr || stdout || err.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Branch Management
// ---------------------------------------------------------------------------

/**
 * Create a feature branch from the base branch. If it already exists, reset it.
 */
async function createBranch(
  projectRoot: string,
  branchName: string,
  baseBranch: string
): Promise<void> {
  const existing = await runAsync(
    `git branch --list "${branchName}"`,
    { cwd: projectRoot }
  );
  if (existing.trim()) {
    // Branch exists — delete and recreate to ensure clean state
    try {
      await runAsync(`git branch -D "${branchName}"`, { cwd: projectRoot });
    } catch {
      // May fail if checked out in a worktree — that's ok
    }
  }
  await runAsync(`git branch "${branchName}" "${baseBranch}"`, {
    cwd: projectRoot,
  });
}

/**
 * Generate the branch name for a feature.
 */
export function featureBranchName(featureId: string): string {
  return `feature/${featureId}`;
}

/**
 * Generate the worktree path for a feature (sibling directory to project root).
 */
export function worktreePath(projectRoot: string, featureId: string): string {
  const parentDir = dirname(projectRoot);
  return resolve(parentDir, `wave-${featureId}`);
}

// ---------------------------------------------------------------------------
// Worktree Lifecycle (async)
// ---------------------------------------------------------------------------

/**
 * Create a git worktree for a feature branch.
 * Returns the absolute path to the worktree.
 *
 * ASYNC — does not block the event loop.
 */
export async function createWorktree(
  projectRoot: string,
  featureId: string,
  baseBranch: string
): Promise<string> {
  const branch = featureBranchName(featureId);
  const wtPath = worktreePath(projectRoot, featureId);

  // Create the branch if it doesn't exist
  log(featureId, "creating branch...");
  await createBranch(projectRoot, branch, baseBranch);

  // Remove existing worktree if present
  if (existsSync(wtPath)) {
    log(featureId, "removing old worktree...");
    try {
      await runAsync(`git worktree remove --force "${wtPath}"`, {
        cwd: projectRoot,
      });
    } catch {
      await runAsync(`rm -rf "${wtPath}"`);
      await runAsync(`git worktree prune`, { cwd: projectRoot });
    }
  }

  // Create the worktree
  log(featureId, "creating worktree...");
  await runAsync(`git worktree add "${wtPath}" "${branch}"`, {
    cwd: projectRoot,
  });

  // Copy .opencode directory into worktree so agents have access to config
  const opencodeDir = resolve(projectRoot, ".opencode");
  if (existsSync(opencodeDir)) {
    const destOpencode = resolve(wtPath, ".opencode");
    cpSync(opencodeDir, destOpencode, { recursive: true });
  }

  // Copy opencode.json if it exists
  const opencodeJson = resolve(projectRoot, "opencode.json");
  if (existsSync(opencodeJson)) {
    cpSync(opencodeJson, resolve(wtPath, "opencode.json"));
  }

  // Copy AGENTS.md if it exists
  const agentsMd = resolve(projectRoot, "AGENTS.md");
  if (existsSync(agentsMd)) {
    cpSync(agentsMd, resolve(wtPath, "AGENTS.md"));
  }

  log(featureId, "worktree ready");
  return wtPath;
}

/**
 * Install dependencies in a worktree using bun.
 * Timeout: 120 seconds.
 *
 * ASYNC — does not block the event loop.
 */
export async function installDeps(
  wtPath: string,
  featureId: string = "?"
): Promise<void> {
  log(featureId, "running bun install...");
  const start = Date.now();
  await runAsync("bun install", { cwd: wtPath, timeoutMs: 120_000 });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(featureId, `bun install done (${elapsed}s)`);
}

/**
 * Check if a worktree already exists and has node_modules.
 * Useful for resume — skip setup if already done.
 */
export function worktreeReady(wtPath: string): boolean {
  return (
    existsSync(wtPath) &&
    existsSync(resolve(wtPath, "node_modules"))
  );
}

// ---------------------------------------------------------------------------
// Worktree Listing / Cleanup (sync — these are fast)
// ---------------------------------------------------------------------------

/**
 * List all git worktrees.
 */
export function listWorktrees(projectRoot: string): WorktreeInfo[] {
  const output = runSync("git worktree list --porcelain", {
    cwd: projectRoot,
    silent: true,
  });
  if (!output) return [];

  const worktrees: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> = {};

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) worktrees.push(current as WorktreeInfo);
      current = { path: line.slice(9), bare: false };
    } else if (line.startsWith("HEAD ")) {
      current.head = line.slice(5);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice(7).replace("refs/heads/", "");
    } else if (line === "bare") {
      current.bare = true;
    } else if (line === "" && current.path) {
      worktrees.push(current as WorktreeInfo);
      current = {};
    }
  }
  if (current.path) worktrees.push(current as WorktreeInfo);

  return worktrees;
}

/**
 * List only wave-related worktrees (paths containing "wave-").
 */
export function listWaveWorktrees(projectRoot: string): WorktreeInfo[] {
  return listWorktrees(projectRoot).filter((wt) => wt.path.includes("wave-"));
}

/**
 * Remove a worktree and optionally delete its branch.
 */
export function removeWorktree(
  projectRoot: string,
  wtPath: string,
  deleteBranchToo: boolean = true
): void {
  const worktrees = listWorktrees(projectRoot);
  const wt = worktrees.find((w) => w.path === wtPath);

  try {
    runSync(`git worktree remove --force "${wtPath}"`, { cwd: projectRoot });
  } catch {
    if (existsSync(wtPath)) {
      runSync(`rm -rf "${wtPath}"`);
    }
    runSync("git worktree prune", { cwd: projectRoot });
  }

  if (deleteBranchToo && wt?.branch) {
    try {
      runSync(`git branch -D "${wt.branch}"`, {
        cwd: projectRoot,
        silent: true,
      });
    } catch {
      // Branch may have been merged or already deleted
    }
  }
}

/**
 * Remove all wave-related worktrees and prune.
 */
export function cleanupAllWorktrees(projectRoot: string): number {
  const waveWorktrees = listWaveWorktrees(projectRoot);
  let removed = 0;
  for (const wt of waveWorktrees) {
    try {
      removeWorktree(projectRoot, wt.path, false);
      removed++;
    } catch (err: any) {
      console.error(`Failed to remove worktree ${wt.path}: ${err.message}`);
    }
  }
  runSync("git worktree prune", { cwd: projectRoot });
  return removed;
}
