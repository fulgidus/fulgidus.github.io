/**
 * launcher.ts — Process spawning and tmux session management.
 *
 * Responsibilities:
 *   - Launch opencode in headless mode (opencode run --format json)
 *   - Launch opencode in interactive mode (tmux session with TUI)
 *   - Resume sessions for auto-retry
 *   - Manage tmux sessions (create, list, kill)
 */

import { spawn, execSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENCODE_BIN =
  process.env.OPENCODE_BIN || resolve(process.env.HOME || "~", ".opencode/bin/opencode");

const TMUX_SESSION_PREFIX = "wave";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaunchResult {
  pid: number;
  process: ChildProcess;
  sessionId?: string;
}

export interface LaunchOptions {
  worktreePath: string;
  featureId: string;
  prompt: string;
  model?: string;
  interactive?: boolean;
}

export interface RetryOptions {
  worktreePath: string;
  featureId: string;
  sessionId: string;
  buildErrors: string;
  model?: string;
  interactive?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmuxSessionName(featureId: string): string {
  return `${TMUX_SESSION_PREFIX}-${featureId}`;
}

function runSilent(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Headless Launch
// ---------------------------------------------------------------------------

/**
 * Launch opencode in headless mode with JSON output.
 * Returns the child process and its PID.
 */
export function launchHeadless(opts: LaunchOptions): LaunchResult {
  const args = [
    "run",
    "--format", "json",
    "--agent", "wave-worker",
    "--dir", opts.worktreePath,
    "--title", `wave: ${opts.featureId}`,
  ];

  if (opts.model) {
    args.push("--model", opts.model);
  }

  // The prompt goes as positional args at the end
  args.push(opts.prompt);

  const child = spawn(OPENCODE_BIN, args, {
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
    env: {
      ...process.env,
      // Ensure the agent runs in the worktree
      OPENCODE_DIR: opts.worktreePath,
    },
  });

  // Close stdin so opencode starts processing immediately
  // Without this, opencode hangs waiting for interactive input
  child.stdin?.end();

  return {
    pid: child.pid!,
    process: child,
  };
}

/**
 * Resume a headless session with a retry message (build errors).
 */
export function retryHeadless(opts: RetryOptions): LaunchResult {
  const retryMessage = `The build failed. Please fix the following errors and run \`bun run build\` again:\n\n\`\`\`\n${opts.buildErrors}\n\`\`\`\n\nFix all errors, then verify the build passes.`;

  const args = [
    "run",
    "--format", "json",
    "--session", opts.sessionId,
    "--continue",
    "--dir", opts.worktreePath,
  ];

  if (opts.model) {
    args.push("--model", opts.model);
  }

  args.push(retryMessage);

  const child = spawn(OPENCODE_BIN, args, {
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
    env: {
      ...process.env,
      OPENCODE_DIR: opts.worktreePath,
    },
  });

  // Close stdin so opencode starts processing immediately
  child.stdin?.end();

  return {
    pid: child.pid!,
    process: child,
  };
}

// ---------------------------------------------------------------------------
// Interactive (tmux) Launch
// ---------------------------------------------------------------------------

/**
 * Launch opencode in a tmux session for interactive use.
 */
export function launchInteractive(opts: LaunchOptions): LaunchResult {
  const sessionName = tmuxSessionName(opts.featureId);

  // Kill existing session if any
  killTmuxSession(opts.featureId);

  // Build the opencode command to run inside tmux
  const ocArgs = [
    OPENCODE_BIN,
    "--dir", JSON.stringify(opts.worktreePath),
  ];

  if (opts.model) {
    ocArgs.push("--model", JSON.stringify(opts.model));
  }

  // For interactive mode, we launch the TUI (default command) with the worktree dir
  // The user can interact with it directly via tmux attach
  const tmuxCmd = ocArgs.join(" ");

  // Create a detached tmux session running opencode
  execSync(
    `tmux new-session -d -s "${sessionName}" -c "${opts.worktreePath}" "${tmuxCmd}"`,
    { stdio: "pipe" }
  );

  // Send the prompt as initial message after a brief delay
  // We use tmux send-keys to type the prompt into the TUI
  const escapedPrompt = opts.prompt
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");

  // Wait a moment for TUI to initialize, then send prompt
  setTimeout(() => {
    try {
      // Write prompt to a temp file and use tmux load-buffer + paste
      const tmpFile = `/tmp/wave-prompt-${opts.featureId}.txt`;
      require("node:fs").writeFileSync(tmpFile, opts.prompt);
      execSync(`tmux load-buffer "${tmpFile}"`, { stdio: "pipe" });
      execSync(`tmux paste-buffer -t "${sessionName}"`, { stdio: "pipe" });
      execSync(`tmux send-keys -t "${sessionName}" Enter`, { stdio: "pipe" });
      // Clean up temp file
      try { require("node:fs").unlinkSync(tmpFile); } catch {}
    } catch {
      // If prompt sending fails, user can type manually
    }
  }, 3000);

  // Get the PID of the tmux server pane process
  const panePid = runSilent(
    `tmux list-panes -t "${sessionName}" -F "#{pane_pid}"`
  );

  return {
    pid: parseInt(panePid) || 0,
    process: null as any, // No direct process handle in tmux mode
  };
}

/**
 * Resume an interactive session with retry message.
 */
export function retryInteractive(opts: RetryOptions): LaunchResult {
  const sessionName = tmuxSessionName(opts.featureId);

  // Check if session still exists
  const exists = tmuxSessionExists(opts.featureId);

  if (exists) {
    // Send the retry message to the existing session
    const retryMsg = `The build failed. Fix these errors:\n${opts.buildErrors}`;
    const tmpFile = `/tmp/wave-retry-${opts.featureId}.txt`;
    require("node:fs").writeFileSync(tmpFile, retryMsg);
    execSync(`tmux load-buffer "${tmpFile}"`, { stdio: "pipe" });
    execSync(`tmux paste-buffer -t "${sessionName}"`, { stdio: "pipe" });
    execSync(`tmux send-keys -t "${sessionName}" Enter`, { stdio: "pipe" });
    try { require("node:fs").unlinkSync(tmpFile); } catch {}

    const panePid = runSilent(
      `tmux list-panes -t "${sessionName}" -F "#{pane_pid}"`
    );

    return {
      pid: parseInt(panePid) || 0,
      process: null as any,
    };
  }

  // Session doesn't exist — launch a new interactive session
  return launchInteractive({
    worktreePath: opts.worktreePath,
    featureId: opts.featureId,
    prompt: `Continue from session ${opts.sessionId}. The build failed:\n${opts.buildErrors}\n\nFix all errors and verify the build passes.`,
    model: opts.model,
    interactive: true,
  });
}

// ---------------------------------------------------------------------------
// tmux Session Management
// ---------------------------------------------------------------------------

/**
 * Check if a tmux session exists for a feature.
 */
export function tmuxSessionExists(featureId: string): boolean {
  const sessionName = tmuxSessionName(featureId);
  const result = runSilent(`tmux has-session -t "${sessionName}" 2>&1`);
  // tmux has-session returns empty on success, error message on failure
  return runSilent(`tmux has-session -t "${sessionName}" 2>/dev/null && echo yes`) === "yes";
}

/**
 * Kill a tmux session for a feature.
 */
export function killTmuxSession(featureId: string): void {
  const sessionName = tmuxSessionName(featureId);
  runSilent(`tmux kill-session -t "${sessionName}" 2>/dev/null`);
}

/**
 * List all wave-related tmux sessions.
 */
export function listTmuxSessions(): string[] {
  const output = runSilent(
    `tmux list-sessions -F "#{session_name}" 2>/dev/null`
  );
  if (!output) return [];
  return output
    .split("\n")
    .filter((s) => s.startsWith(TMUX_SESSION_PREFIX + "-"));
}

/**
 * Kill all wave-related tmux sessions.
 */
export function killAllTmuxSessions(): number {
  const sessions = listTmuxSessions();
  for (const s of sessions) {
    runSilent(`tmux kill-session -t "${s}" 2>/dev/null`);
  }
  return sessions.length;
}

/**
 * Check if a process is still running by PID.
 */
export function isProcessRunning(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
