#!/usr/bin/env bun
/**
 * wave-runner.ts — Main CLI entry point for the wave-runner agent orchestration system.
 *
 * Usage:
 *   bun scripts/wave-runner.ts launch --top-priority 3
 *   bun scripts/wave-runner.ts launch --quickest-wins 5
 *   bun scripts/wave-runner.ts launch --priority high
 *   bun scripts/wave-runner.ts launch --difficulty easy
 *   bun scripts/wave-runner.ts launch --features "dead-code-cleanup,reading-progress-theme"
 *   bun scripts/wave-runner.ts launch --all-ready
 *   bun scripts/wave-runner.ts launch ... --max-concurrent 3 --model "anthropic/claude-sonnet-4-20250514"
 *   bun scripts/wave-runner.ts launch ... --interactive
 *   bun scripts/wave-runner.ts status
 *   bun scripts/wave-runner.ts verify [feature-id]
 *   bun scripts/wave-runner.ts merge [feature-id]
 *   bun scripts/wave-runner.ts retry <feature-id>
 *   bun scripts/wave-runner.ts cleanup
 */

import { resolve } from "node:path";
import {
  loadFeatures,
  selectFeatures,
  parseDurationMinutes,
  type Feature,
  type SelectionOptions,
  type Priority,
  type Difficulty,
} from "./lib/features.js";
import {
  loadState,
  saveState,
  createWaveState,
  createAgentState,
  updateAgent,
  activeAgents,
  queuedAgents,
  isWaveComplete,
  type WaveState,
  type AgentState,
} from "./lib/state.js";
import {
  createWorktree,
  installDeps,
  featureBranchName,
  worktreePath,
  worktreeReady,
  cleanupAllWorktrees,
  removeWorktree,
  listWaveWorktrees,
  log as wtLog,
} from "./lib/worktree.js";
import { generatePrompt } from "./lib/prompt.js";
import {
  launchHeadless,
  retryHeadless,
  launchInteractive,
  retryInteractive,
  killAllTmuxSessions,
  killTmuxSession,
  isProcessRunning,
  listTmuxSessions,
} from "./lib/launcher.js";
import { ProcessMonitor } from "./lib/monitor.js";
import { runBuild } from "./lib/verifier.js";
import { mergeBranch, deleteBranch } from "./lib/merger.js";
import {
  printDashboard,
  printFeatureSelection,
  printAgentUpdate,
} from "./lib/ui.js";
import { WaveTUI } from "./lib/tui.js";
import { exec } from "node:child_process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = resolve(
  (import.meta as any).dir || new URL(".", import.meta.url).pathname,
  ".."
);
const DEFAULT_BASE_BRANCH = "develop";
const DEFAULT_MAX_CONCURRENT = 6;
const DEFAULT_MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

/**
 * Push the base branch to its remote (origin) after all merges.
 * Returns true on success, false on failure.
 */
async function pushBaseBranch(baseBranch: string): Promise<boolean> {
  console.log(`\nPushing ${baseBranch} to origin...`);
  return new Promise((resolve) => {
    exec(
      `git push origin "${baseBranch}"`,
      { cwd: PROJECT_ROOT, encoding: "utf-8", timeout: 120_000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Push failed: ${stderr?.trim() || error.message}`);
          resolve(false);
        } else {
          console.log(`Pushed ${baseBranch} to origin.`);
          resolve(true);
        }
      }
    );
  });
}

interface CLIArgs {
  command: string;
  topPriority?: number;
  quickestWins?: number;
  priority?: Priority;
  difficulty?: Difficulty;
  features?: string[];
  allReady?: boolean;
  maxConcurrent: number;
  model?: string;
  interactive: boolean;
  featureId?: string;
  dryRun: boolean;
  baseBranch: string;
  maxRetries: number;
  noTui: boolean;
  autoPush: boolean;
}

function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2); // skip 'bun' and script path
  const result: CLIArgs = {
    command: args[0] || "help",
    maxConcurrent: DEFAULT_MAX_CONCURRENT,
    interactive: false,
    dryRun: false,
    baseBranch: DEFAULT_BASE_BRANCH,
    maxRetries: DEFAULT_MAX_RETRIES,
    noTui: false,
    autoPush: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--top-priority":
        result.topPriority = parseInt(args[++i], 10);
        break;
      case "--quickest-wins":
        result.quickestWins = parseInt(args[++i], 10);
        break;
      case "--priority":
        result.priority = args[++i] as Priority;
        break;
      case "--difficulty":
        result.difficulty = args[++i] as Difficulty;
        break;
      case "--features":
        result.features = args[++i].split(",").map((s) => s.trim());
        break;
      case "--all-ready":
        result.allReady = true;
        break;
      case "--max-concurrent":
        result.maxConcurrent = parseInt(args[++i], 10);
        break;
      case "--model":
      case "-m":
        result.model = args[++i];
        break;
      case "--interactive":
        result.interactive = true;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--no-tui":
        result.noTui = true;
        break;
      case "--auto-push":
        result.autoPush = true;
        break;
      case "--base-branch":
        result.baseBranch = args[++i];
        break;
      case "--max-retries":
        result.maxRetries = parseInt(args[++i], 10);
        break;
      default:
        // Positional arg after command (e.g., feature-id for retry)
        if (!arg.startsWith("-") && i === 1) {
          // Could be a feature-id for retry/verify/merge commands
          // Already handled by command parsing
        } else if (!arg.startsWith("-")) {
          result.featureId = arg;
        }
        break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Launch a wave of agents.
 */
async function cmdLaunch(args: CLIArgs): Promise<void> {
  console.log("\n--- Wave Runner: Launch ---\n");

  // Load features
  const data = loadFeatures(PROJECT_ROOT);

  // Build selection options
  const selOpts: SelectionOptions = {};
  if (args.topPriority) selOpts.topPriority = args.topPriority;
  if (args.quickestWins) selOpts.quickestWins = args.quickestWins;
  if (args.priority) selOpts.priority = args.priority;
  if (args.difficulty) selOpts.difficulty = args.difficulty;
  if (args.features) selOpts.featureIds = args.features;
  if (args.allReady) selOpts.allReady = true;

  // Select features
  const selected = selectFeatures(data, selOpts);

  if (selected.length === 0) {
    console.error(
      "No features matched the selection criteria. Use --all-ready to see all available."
    );
    process.exit(1);
  }

  // Show selection
  printFeatureSelection(
    selected.map((f) => ({
      id: f.id,
      title: f.title,
      priority: f.priority,
      difficulty: f.difficulty,
      effort: f.effort,
    }))
  );

  if (args.dryRun) {
    console.log("Dry run — not launching agents.");
    return;
  }

  // Create wave state
  const state = createWaveState({
    baseBranch: args.baseBranch,
    maxConcurrent: args.maxConcurrent,
    model: args.model ?? null,
    interactive: args.interactive,
  });

  // Create agent entries for all selected features
  for (const feature of selected) {
    const branch = featureBranchName(feature.id);
    const wtPath = worktreePath(PROJECT_ROOT, feature.id);
    const agent = createAgentState(
      feature.id,
      branch,
      wtPath,
      args.maxRetries
    );
    // Set effort estimate from feature spec
    const effortMinutes = parseDurationMinutes(feature.effort);
    agent.effort_estimate_ms = effortMinutes === Infinity ? null : effortMinutes * 60 * 1000;
    state.agents.push(agent);
  }

  saveState(PROJECT_ROOT, state);
  console.log(`Wave ${state.wave_id} created with ${selected.length} agents.`);

  // Launch agents up to max_concurrent
  if (args.interactive) {
    await launchWaveInteractive(state, selected, args);
  } else {
    await launchWaveHeadless(state, selected, args);
  }
}

/**
 * Launch agents in headless mode with monitoring loop.
 */
async function launchWaveHeadless(
  state: WaveState,
  features: Feature[],
  args: CLIArgs
): Promise<void> {
  const featureMap = new Map(features.map((f) => [f.id, f]));

  const monitor = new ProcessMonitor(PROJECT_ROOT, {
    onSessionId: (featureId, sessionId) => {
      updateAgent(state, featureId, { session_id: sessionId });
      saveState(PROJECT_ROOT, state);
    },
    onComplete: (featureId) => {
      updateAgent(state, featureId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      saveState(PROJECT_ROOT, state);

      // Run build verification — fire-and-forget (this is a sync event handler)
      const agent = state.agents.find((a) => a.feature_id === featureId)!;
      handleBuildVerification(state, agent, featureMap.get(featureId)!, args, monitor)
        .then(() => launchNextQueued(state, featureMap, monitor, args))
        .catch((err) => {
          wtLog(featureId, `BUILD VERIFICATION UNHANDLED ERROR: ${err.message}`);
          launchNextQueued(state, featureMap, monitor, args);
        });
    },
    onError: (featureId, error) => {
      const agent = state.agents.find((a) => a.feature_id === featureId)!;
      if (agent.retries < agent.max_retries) {
        updateAgent(state, featureId, {
          status: "retry",
          retries: agent.retries + 1,
          error,
        });
        saveState(PROJECT_ROOT, state);

        // Retry
        handleRetry(state, agent, monitor, args);
      } else {
        updateAgent(state, featureId, {
          status: "failed",
          error,
          completed_at: new Date().toISOString(),
        });
        saveState(PROJECT_ROOT, state);
      }

      // Try to launch next queued agent
      launchNextQueued(state, featureMap, monitor, args);
    },
    onOutput: (_featureId, _data) => {
      // Raw output — logged to file by ProcessMonitor
    },
    onActivity: (featureId, activity) => {
      updateAgent(state, featureId, {
        activity,
        activity_updated_at: new Date().toISOString(),
      });
      // Don't save to disk on every activity — too frequent.
    },
  });

  // Create the TUI — it will auto-refresh and show activity from the monitor
  // Using ref object to avoid TypeScript narrowing issues with closures
  const tuiRef = { current: null as WaveTUI | null };
  const startTUI = () => {
    tuiRef.current = new WaveTUI({
      state,
      monitor,
      projectRoot: PROJECT_ROOT,
      interactive: false,
      onQuit: () => {
        // Same as SIGINT — save state and exit
        for (const agent of state.agents) {
          if (agent.status === "running") {
            updateAgent(state, agent.feature_id, { activity: "interrupted" });
          }
        }
        monitor.killAll();
        saveState(PROJECT_ROOT, state);
        console.log("State saved. Use 'bun scripts/wave-runner.ts resume' to continue.");
        process.exit(0);
      },
    });
    tuiRef.current.start();
  };

  // Handle graceful shutdown (also handles SIGINT when TUI is not focused)
  process.on("SIGINT", () => {
    if (tuiRef.current) tuiRef.current.stop();
    for (const agent of state.agents) {
      if (agent.status === "running") {
        updateAgent(state, agent.feature_id, { activity: "interrupted" });
      }
    }
    monitor.killAll();
    saveState(PROJECT_ROOT, state);
    console.log("\nState saved. Use 'bun scripts/wave-runner.ts resume' to continue.");
    process.exit(0);
  });

  // Launch initial batch — set up worktrees in parallel
  const tolaunch = queuedAgents(state).slice(0, args.maxConcurrent);
  console.log(`Setting up ${tolaunch.length} agent(s) in parallel...\n`);

  await Promise.all(
    tolaunch.map((agent) =>
      launchSingleHeadless(
        state,
        agent,
        featureMap.get(agent.feature_id)!,
        monitor,
        args
      )
    )
  );

  const launched = state.agents.filter((a) => a.status === "running").length;

  // Start the TUI dashboard (or skip if --no-tui)
  if (args.noTui) {
    console.log(`${launched} agent(s) running. (--no-tui mode, dashboard prints every 15s)\n`);
    printDashboard(state);
  } else {
    console.log(`${launched} agent(s) running. Launching TUI...\n`);
    startTUI();
  }

  // Background monitoring loop — checks for dead processes and launches queued
  const POLL_INTERVAL = 5000;
  let dashboardCounter = 0;
  while (!isWaveComplete(state)) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    // Check for completed processes that weren't caught by event handlers
    for (const agent of state.agents) {
      if (
        agent.status === "running" &&
        agent.pid &&
        !isProcessRunning(agent.pid) &&
        !monitor.isRunning(agent.feature_id)
      ) {
        // Process exited but we didn't get a callback
        updateAgent(state, agent.feature_id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          activity: "done",
        });
        saveState(PROJECT_ROOT, state);
        try {
          await handleBuildVerification(state, agent, featureMap.get(agent.feature_id)!, args, monitor);
        } catch (err: any) {
          wtLog(agent.feature_id, `POLL VERIFY ERROR: ${err.message}`);
        }
        launchNextQueued(state, featureMap, monitor, args);
      }
    }

    // Persist state periodically
    saveState(PROJECT_ROOT, state);

    // Update TUI state reference (or print dashboard in --no-tui mode)
    if (tuiRef.current) {
      tuiRef.current.updateState(state);
    } else if (args.noTui) {
      dashboardCounter++;
      // Print dashboard every ~15 seconds (3 poll cycles at 5s each)
      if (dashboardCounter % 3 === 0) {
  printDashboard(state);

  // Auto-push base branch if requested
  if (args.autoPush) {
    const anyMerged = state.agents.some((a) => a.status === "merged");
    if (anyMerged) {
      await pushBaseBranch(state.base_branch);
    } else {
      console.log("No branches were merged — skipping push.");
    }
  }
}
    }
  }

  // Wave complete — tear down TUI and show final summary
  if (tuiRef.current) tuiRef.current.stop();
  printDashboard(state);

  // Auto-push base branch if requested
  if (args.autoPush) {
    await pushBaseBranch(state.base_branch);
  }

  console.log("Wave complete.");
}

/**
 * Launch a single agent in headless mode.
 */
async function launchSingleHeadless(
  state: WaveState,
  agent: AgentState,
  feature: Feature,
  monitor: ProcessMonitor,
  args: CLIArgs
): Promise<void> {
  updateAgent(state, agent.feature_id, {
    status: "installing",
    started_at: new Date().toISOString(),
    activity: "setting up worktree...",
  });
  saveState(PROJECT_ROOT, state);

  try {
    // Skip worktree setup if already ready (resume case)
    if (worktreeReady(agent.worktree)) {
      wtLog(agent.feature_id, "worktree already exists, skipping setup");
    } else {
      // Create worktree (async — doesn't block other agents)
      await createWorktree(PROJECT_ROOT, feature.id, args.baseBranch);

      // Install dependencies (async)
      updateAgent(state, agent.feature_id, { activity: "installing deps..." });
      await installDeps(agent.worktree, feature.id);
    }

    // Generate prompt
    const prompt = generatePrompt(feature, args.baseBranch);

    // Launch opencode
    wtLog(agent.feature_id, "launching opencode agent...");
    const result = launchHeadless({
      worktreePath: agent.worktree,
      featureId: feature.id,
      prompt,
      model: args.model,
    });

    updateAgent(state, agent.feature_id, {
      status: "running",
      pid: result.pid,
      activity: "starting...",
    });
    saveState(PROJECT_ROOT, state);

    monitor.addProcess(feature.id, result.process);
    wtLog(agent.feature_id, `running (PID: ${result.pid})`);
  } catch (err: any) {
    updateAgent(state, agent.feature_id, {
      status: "failed",
      error: err.message,
      activity: null,
      completed_at: new Date().toISOString(),
    });
    saveState(PROJECT_ROOT, state);
    wtLog(agent.feature_id, `SETUP FAILED: ${err.message.split("\n")[0]}`);
  }
}

/**
 * Handle build verification after agent completion.
 * If monitor is provided, retry processes will be added for monitoring.
 *
 * ASYNC — runs build and merge without blocking the event loop.
 */
async function handleBuildVerification(
  state: WaveState,
  agent: AgentState,
  feature: Feature,
  args: CLIArgs,
  monitor?: ProcessMonitor
): Promise<void> {
  try {
    printAgentUpdate(agent, "verifying build...");

    const buildResult = await runBuild(agent.worktree);

    if (buildResult.passed) {
      updateAgent(state, agent.feature_id, {
        status: "verified",
        build_passed: true,
        build_output: null,
      });
      saveState(PROJECT_ROOT, state);
      printAgentUpdate(agent, `BUILD PASSED (${Math.round(buildResult.durationMs / 1000)}s)`);

      // Auto-merge: merge verified branch into base immediately
      printAgentUpdate(agent, "auto-merging...");
      try {
        const mergeResult = await mergeBranch(PROJECT_ROOT, agent.branch, state.base_branch);

        if (mergeResult.success) {
          updateAgent(state, agent.feature_id, {
            status: "merged",
            completed_at: new Date().toISOString(),
          });
          saveState(PROJECT_ROOT, state);
          printAgentUpdate(agent, `MERGED (${mergeResult.commitHash?.slice(0, 7)})`);

          // Clean up worktree after successful merge
          try {
            removeWorktree(PROJECT_ROOT, agent.worktree, false);
            printAgentUpdate(agent, "worktree removed");
          } catch {
            // Not critical — worktree cleanup is best-effort
          }
        } else {
          // Merge failed (conflicts, etc.) — leave as verified for manual resolution
          printAgentUpdate(agent, `AUTO-MERGE FAILED: ${mergeResult.error}`);
        }
      } catch (mergeErr: any) {
        printAgentUpdate(agent, `AUTO-MERGE ERROR: ${mergeErr.message?.slice(0, 100)}`);
      }
    } else {
      if (agent.retries < agent.max_retries) {
        updateAgent(state, agent.feature_id, {
          status: "retry",
          retries: agent.retries + 1,
          build_passed: false,
          build_output: buildResult.errorSummary,
        });
        saveState(PROJECT_ROOT, state);
        printAgentUpdate(
          agent,
          `BUILD FAILED — retrying (${agent.retries}/${agent.max_retries})`
        );

        // Retry with build errors
        if (agent.session_id) {
          const retryResult = retryHeadless({
            worktreePath: agent.worktree,
            featureId: agent.feature_id,
            sessionId: agent.session_id,
            buildErrors: buildResult.errorSummary,
            model: args.model,
          });

          updateAgent(state, agent.feature_id, {
            status: "running",
            pid: retryResult.pid,
          });
          saveState(PROJECT_ROOT, state);

          // Add retry process to monitor so events are tracked
          if (monitor) {
            monitor.addProcess(agent.feature_id, retryResult.process);
          }
        }
      } else {
        updateAgent(state, agent.feature_id, {
          status: "failed",
          build_passed: false,
          build_output: buildResult.errorSummary,
          error: `Build failed after ${agent.max_retries} retries`,
          completed_at: new Date().toISOString(),
        });
        saveState(PROJECT_ROOT, state);
        printAgentUpdate(agent, "BUILD FAILED — max retries reached");
      }
    }
  } catch (err: any) {
    // Catch-all — never let build verification crash the process
    printAgentUpdate(agent, `VERIFY ERROR: ${err.message?.slice(0, 100)}`);
    updateAgent(state, agent.feature_id, {
      status: "failed",
      error: `Build verification error: ${err.message}`,
      completed_at: new Date().toISOString(),
    });
    saveState(PROJECT_ROOT, state);
  }
}

/**
 * Handle retry of a failed agent.
 */
function handleRetry(
  state: WaveState,
  agent: AgentState,
  monitor: ProcessMonitor,
  args: CLIArgs
): void {
  if (!agent.session_id || !agent.error) return;

  const retryResult = retryHeadless({
    worktreePath: agent.worktree,
    featureId: agent.feature_id,
    sessionId: agent.session_id,
    buildErrors: agent.error,
    model: args.model,
  });

  updateAgent(state, agent.feature_id, {
    status: "running",
    pid: retryResult.pid,
  });
  saveState(PROJECT_ROOT, state);

  monitor.addProcess(agent.feature_id, retryResult.process);
}

/**
 * Launch the next queued agent if capacity allows.
 */
function launchNextQueued(
  state: WaveState,
  featureMap: Map<string, Feature>,
  monitor: ProcessMonitor,
  args: CLIArgs
): void {
  const active = activeAgents(state);
  const queued = queuedAgents(state);

  if (active.length < state.max_concurrent && queued.length > 0) {
    const next = queued[0];
    const feature = featureMap.get(next.feature_id);
    if (feature) {
      launchSingleHeadless(state, next, feature, monitor, args);
    }
  }
}

/**
 * Launch agents in interactive (tmux) mode.
 */
async function launchWaveInteractive(
  state: WaveState,
  features: Feature[],
  args: CLIArgs
): Promise<void> {
  const featureMap = new Map(features.map((f) => [f.id, f]));

  // Show dashboard immediately
  printDashboard(state);

  // Launch initial batch in tmux — parallelize setup
  const tolaunch = queuedAgents(state).slice(0, args.maxConcurrent);
  console.log(`Setting up ${tolaunch.length} agent(s) in parallel...\n`);

  await Promise.all(
    tolaunch.map(async (agent) => {
      updateAgent(state, agent.feature_id, {
        status: "installing",
        started_at: new Date().toISOString(),
        activity: "setting up worktree...",
      });
      saveState(PROJECT_ROOT, state);

      try {
        if (worktreeReady(agent.worktree)) {
          wtLog(agent.feature_id, "worktree already exists, skipping setup");
        } else {
          await createWorktree(PROJECT_ROOT, agent.feature_id, args.baseBranch);
          updateAgent(state, agent.feature_id, { activity: "installing deps..." });
          await installDeps(agent.worktree, agent.feature_id);
        }

        const prompt = generatePrompt(
          featureMap.get(agent.feature_id)!,
          args.baseBranch
        );

        wtLog(agent.feature_id, "launching tmux session...");
        const result = launchInteractive({
          worktreePath: agent.worktree,
          featureId: agent.feature_id,
          prompt,
          model: args.model,
          interactive: true,
        });

        updateAgent(state, agent.feature_id, {
          status: "running",
          pid: result.pid,
          activity: "tmux session active",
        });
        saveState(PROJECT_ROOT, state);
        wtLog(agent.feature_id, `tmux session: wave-${agent.feature_id}`);
      } catch (err: any) {
        updateAgent(state, agent.feature_id, {
          status: "failed",
          error: err.message,
          activity: null,
          completed_at: new Date().toISOString(),
        });
        saveState(PROJECT_ROOT, state);
        wtLog(agent.feature_id, `SETUP FAILED: ${err.message.split("\n")[0]}`);
      }
    })
  );

  console.log("\nInteractive sessions launched. Use these commands:");
  console.log("  tmux attach -t wave-<feature-id>   # attach to a session");
  console.log("  tmux ls                             # list sessions");
  console.log("  bun scripts/wave-runner.ts status   # check status");
  console.log("  bun scripts/wave-runner.ts verify   # verify builds");
  console.log("  bun scripts/wave-runner.ts merge    # merge verified");
  console.log("  bun scripts/wave-runner.ts cleanup  # remove worktrees");

  printDashboard(state);
}

/**
 * Show the status of the current wave.
 */
function cmdStatus(_args: CLIArgs): void {
  const state = loadState(PROJECT_ROOT);
  if (!state) {
    console.log("No active wave. Use 'launch' to start one.");
    return;
  }

  // Update running agent status from process state
  for (const agent of state.agents) {
    if (agent.status === "running" && agent.pid) {
      if (!isProcessRunning(agent.pid)) {
        updateAgent(state, agent.feature_id, {
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      }
    }
  }
  saveState(PROJECT_ROOT, state);

  printDashboard(state);
}

/**
 * Run build verification on completed agents.
 */
async function cmdVerify(args: CLIArgs): Promise<void> {
  const state = loadState(PROJECT_ROOT);
  if (!state) {
    console.log("No active wave.");
    return;
  }

  const toVerify = args.featureId
    ? state.agents.filter((a) => a.feature_id === args.featureId)
    : state.agents.filter((a) => a.status === "completed");

  if (toVerify.length === 0) {
    console.log("No agents to verify.");
    return;
  }

  console.log(`\nVerifying ${toVerify.length} agent(s)...\n`);

  const data = loadFeatures(PROJECT_ROOT);

  for (const agent of toVerify) {
    const feature = data.features.find((f) => f.id === agent.feature_id);
    if (!feature) continue;

    await handleBuildVerification(state, agent, feature, args);
  }

  printDashboard(state);
}

/**
 * Merge verified branches into the base branch.
 */
async function cmdMerge(args: CLIArgs): Promise<void> {
  const state = loadState(PROJECT_ROOT);
  if (!state) {
    console.log("No active wave.");
    return;
  }

  const toMerge = args.featureId
    ? state.agents.filter(
        (a) => a.feature_id === args.featureId && a.status === "verified"
      )
    : state.agents.filter((a) => a.status === "verified");

  if (toMerge.length === 0) {
    console.log("No verified agents to merge.");
    return;
  }

  console.log(`\nMerging ${toMerge.length} branch(es)...\n`);

  for (const agent of toMerge) {
    printAgentUpdate(agent, "merging...");
    const result = await mergeBranch(PROJECT_ROOT, agent.branch, state.base_branch);

    if (result.success) {
      updateAgent(state, agent.feature_id, {
        status: "merged",
      });
      saveState(PROJECT_ROOT, state);
      printAgentUpdate(agent, `MERGED (${result.commitHash?.slice(0, 7)})`);

      // Clean up worktree
      try {
        removeWorktree(PROJECT_ROOT, agent.worktree, false);
        printAgentUpdate(agent, "worktree removed");
      } catch {
        // Not critical
      }
    } else {
      printAgentUpdate(agent, `MERGE FAILED: ${result.error}`);
    }
  }

  printDashboard(state);
}

/**
 * Retry a specific failed agent.
 */
async function cmdRetry(args: CLIArgs): Promise<void> {
  if (!args.featureId) {
    console.error("Usage: wave-runner retry <feature-id>");
    process.exit(1);
  }

  const state = loadState(PROJECT_ROOT);
  if (!state) {
    console.log("No active wave.");
    return;
  }

  const agent = state.agents.find((a) => a.feature_id === args.featureId);
  if (!agent) {
    console.error(`Agent not found for feature: ${args.featureId}`);
    process.exit(1);
  }

  if (agent.status !== "failed") {
    console.error(
      `Agent ${args.featureId} is not in failed state (current: ${agent.status})`
    );
    process.exit(1);
  }

  // Reset retry count and re-run
  updateAgent(state, agent.feature_id, {
    status: "queued",
    retries: 0,
    error: null,
    build_passed: null,
    build_output: null,
    completed_at: null,
  });
  saveState(PROJECT_ROOT, state);

  const data = loadFeatures(PROJECT_ROOT);
  const feature = data.features.find((f) => f.id === args.featureId);
  if (!feature) {
    console.error(`Feature ${args.featureId} not found in .features.yml`);
    process.exit(1);
  }

  if (args.interactive) {
    const prompt = generatePrompt(feature, state.base_branch);
    launchInteractive({
      worktreePath: agent.worktree,
      featureId: feature.id,
      prompt,
      model: args.model,
      interactive: true,
    });

    updateAgent(state, agent.feature_id, {
      status: "running",
      started_at: new Date().toISOString(),
    });
    saveState(PROJECT_ROOT, state);
    console.log(`Retrying ${args.featureId} in tmux session wave-${args.featureId}`);
  } else {
    const monitor = new ProcessMonitor(PROJECT_ROOT);
    await launchSingleHeadless(state, agent, feature, monitor, args);
    console.log(`Retrying ${args.featureId} in headless mode`);
  }
}

/**
 * Resume a previously stopped wave.
 *
 * Restores from .wave-state.json:
 *   - Agents in "running"/"installing" whose PID is dead → re-check or re-launch
 *   - Agents in "queued" → launch them
 *   - Agents in terminal states (verified/failed/merged) → leave alone
 */
async function cmdResume(args: CLIArgs): Promise<void> {
  const state = loadState(PROJECT_ROOT);
  if (!state) {
    console.error("No wave state found. Use 'launch' to start a new wave.");
    process.exit(1);
  }

  console.log(`\n--- Wave Runner: Resume ${state.wave_id} ---\n`);

  // Load feature data for prompt generation
  const data = loadFeatures(PROJECT_ROOT);
  const featureMap = new Map(data.features.map((f) => [f.id, f]));

  // Triage agents by current state
  let toRelaunch: AgentState[] = [];
  let toVerify: AgentState[] = [];

  for (const agent of state.agents) {
    switch (agent.status) {
      case "running":
      case "installing":
      case "retry":
        // Was in-flight when we stopped — check if PID is still alive
        if (agent.pid && isProcessRunning(agent.pid)) {
          console.log(`  ${agent.feature_id}: still running (PID ${agent.pid}), leaving alone`);
        } else {
          // Process is dead — check if worktree has meaningful changes
          if (worktreeReady(agent.worktree)) {
            // Worktree exists, try build verification first
            console.log(`  ${agent.feature_id}: process dead, worktree exists — will verify build`);
            toVerify.push(agent);
          } else {
            // Worktree gone or incomplete — re-launch from scratch
            console.log(`  ${agent.feature_id}: process dead, no worktree — will re-launch`);
            updateAgent(state, agent.feature_id, {
              status: "queued",
              pid: null,
              activity: null,
              session_id: null,
            });
            toRelaunch.push(agent);
          }
        }
        break;

      case "queued":
        console.log(`  ${agent.feature_id}: queued — will launch`);
        toRelaunch.push(agent);
        break;

      case "completed":
        // Completed but not verified — verify
        console.log(`  ${agent.feature_id}: completed — will verify build`);
        toVerify.push(agent);
        break;

      case "verified":
      case "merged":
        console.log(`  ${agent.feature_id}: ${agent.status} — nothing to do`);
        break;

      case "failed":
        console.log(`  ${agent.feature_id}: failed — skipping (use 'retry' to re-run)`);
        break;
    }
  }

  saveState(PROJECT_ROOT, state);

  // Run build verification on agents that were mid-flight
  for (const agent of toVerify) {
    const feature = featureMap.get(agent.feature_id);
    if (!feature) continue;
    console.log(`\n  Verifying ${agent.feature_id}...`);
    try {
      await handleBuildVerification(state, agent, feature, args);
    } catch (err: any) {
      console.log(`  Verify error for ${agent.feature_id}: ${err.message}`);
    }

    // If build failed and retries remain, queue for re-launch
    if (agent.status === "retry" || agent.status === "running") {
      toRelaunch.push(agent);
    }
  }

  // Re-launch agents
  const toLaunchNow = toRelaunch.slice(0, args.maxConcurrent || state.max_concurrent);
  if (toLaunchNow.length === 0) {
    console.log("\nNo agents need (re)launching.");
    printDashboard(state);
    return;
  }

  console.log(`\nRe-launching ${toLaunchNow.length} agent(s)...\n`);
  printDashboard(state);

  if (args.interactive) {
    // Interactive resume
    await Promise.all(
      toLaunchNow.map(async (agent) => {
        const feature = featureMap.get(agent.feature_id);
        if (!feature) return;

        updateAgent(state, agent.feature_id, {
          status: "installing",
          started_at: new Date().toISOString(),
          activity: "resuming...",
        });
        saveState(PROJECT_ROOT, state);

        try {
          if (!worktreeReady(agent.worktree)) {
            await createWorktree(PROJECT_ROOT, agent.feature_id, state.base_branch);
            await installDeps(agent.worktree, agent.feature_id);
          }

          const prompt = generatePrompt(feature, state.base_branch);
          const result = launchInteractive({
            worktreePath: agent.worktree,
            featureId: feature.id,
            prompt,
            model: args.model || state.model || undefined,
            interactive: true,
          });

          updateAgent(state, agent.feature_id, {
            status: "running",
            pid: result.pid,
            activity: "tmux session active",
          });
          saveState(PROJECT_ROOT, state);
        } catch (err: any) {
          updateAgent(state, agent.feature_id, {
            status: "failed",
            error: err.message,
            activity: null,
            completed_at: new Date().toISOString(),
          });
          saveState(PROJECT_ROOT, state);
        }
      })
    );

    printDashboard(state);
    console.log("\nResume complete. Use 'tmux attach -t wave-<id>' to check sessions.");
  } else {
    // Headless resume — re-enter monitoring loop
    const monitor = new ProcessMonitor(PROJECT_ROOT, {
      onSessionId: (featureId, sessionId) => {
        updateAgent(state, featureId, { session_id: sessionId });
        saveState(PROJECT_ROOT, state);
      },
      onComplete: (featureId) => {
        updateAgent(state, featureId, {
          status: "completed",
          completed_at: new Date().toISOString(),
          activity: "done",
        });
        saveState(PROJECT_ROOT, state);
        wtLog(featureId, "agent completed — verifying build...");

        const agent = state.agents.find((a) => a.feature_id === featureId)!;
        const feature = featureMap.get(featureId)!;
        handleBuildVerification(state, agent, feature, args, monitor)
          .then(() => launchNextQueued(state, featureMap, monitor, args))
          .catch((err) => {
            wtLog(featureId, `BUILD VERIFICATION UNHANDLED ERROR: ${err.message}`);
            launchNextQueued(state, featureMap, monitor, args);
          });
      },
      onError: (featureId, error) => {
        const agent = state.agents.find((a) => a.feature_id === featureId)!;
        if (agent.retries < agent.max_retries) {
          updateAgent(state, featureId, {
            status: "retry",
            retries: agent.retries + 1,
            error,
            activity: "retrying...",
          });
          saveState(PROJECT_ROOT, state);
          handleRetry(state, agent, monitor, args);
        } else {
          updateAgent(state, featureId, {
            status: "failed",
            error,
            activity: null,
            completed_at: new Date().toISOString(),
          });
          saveState(PROJECT_ROOT, state);
        }
        launchNextQueued(state, featureMap, monitor, args);
      },
      onActivity: (featureId, activity) => {
        updateAgent(state, featureId, {
          activity,
          activity_updated_at: new Date().toISOString(),
        });
      },
    });

    // Handle graceful shutdown
    const tuiRef2 = { current: null as WaveTUI | null };
    process.on("SIGINT", () => {
      if (tuiRef2.current) tuiRef2.current.stop();
      // Mark running agents as interrupted so resume knows
      for (const agent of state.agents) {
        if (agent.status === "running") {
          updateAgent(state, agent.feature_id, {
            activity: "interrupted",
          });
        }
      }
      monitor.killAll();
      saveState(PROJECT_ROOT, state);
      console.log("\nState saved. Use 'bun scripts/wave-runner.ts resume' to continue.");
      process.exit(0);
    });

    await Promise.all(
      toLaunchNow.map((agent) => {
        const feature = featureMap.get(agent.feature_id);
        if (!feature) return Promise.resolve();
        return launchSingleHeadless(state, agent, feature, monitor, args);
      })
    );

    // Start TUI dashboard (or skip if --no-tui)
    if (!args.noTui) {
      tuiRef2.current = new WaveTUI({
        state,
        monitor,
        projectRoot: PROJECT_ROOT,
        interactive: false,
        onQuit: () => {
          for (const agent of state.agents) {
            if (agent.status === "running") {
              updateAgent(state, agent.feature_id, { activity: "interrupted" });
            }
          }
          monitor.killAll();
          saveState(PROJECT_ROOT, state);
          console.log("State saved. Use 'bun scripts/wave-runner.ts resume' to continue.");
          process.exit(0);
        },
      });
      tuiRef2.current.start();
    } else {
      console.log("(--no-tui mode, dashboard prints every 15s)\n");
      printDashboard(state);
    }

    // Monitoring loop
    const POLL_INTERVAL = 5000;
    let dashboardCounter2 = 0;
    while (!isWaveComplete(state)) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      for (const agent of state.agents) {
        if (
          agent.status === "running" &&
          agent.pid &&
          !isProcessRunning(agent.pid) &&
          !monitor.isRunning(agent.feature_id)
        ) {
          updateAgent(state, agent.feature_id, {
            status: "completed",
            completed_at: new Date().toISOString(),
            activity: "done",
          });
          saveState(PROJECT_ROOT, state);
          const feature = featureMap.get(agent.feature_id)!;
          try {
            await handleBuildVerification(state, agent, feature, args, monitor);
          } catch (err: any) {
            wtLog(agent.feature_id, `POLL VERIFY ERROR: ${err.message}`);
          }
          launchNextQueued(state, featureMap, monitor, args);
        }
      }

      saveState(PROJECT_ROOT, state);
      if (tuiRef2.current) {
        tuiRef2.current.updateState(state);
      } else if (args.noTui) {
        dashboardCounter2++;
        if (dashboardCounter2 % 3 === 0) {
          printDashboard(state);
        }
      }
    }

    if (tuiRef2.current) tuiRef2.current.stop();
    printDashboard(state);

    // Auto-push base branch if requested
    if (args.autoPush) {
      await pushBaseBranch(state.base_branch);
    }

    console.log("Wave complete.");
  }
}

/**
 * Clean up all wave-related resources.
 */
function cmdCleanup(_args: CLIArgs): void {
  console.log("\n--- Wave Runner: Cleanup ---\n");

  // Kill tmux sessions
  const killed = killAllTmuxSessions();
  console.log(`Killed ${killed} tmux session(s)`);

  // Remove worktrees
  const removed = cleanupAllWorktrees(PROJECT_ROOT);
  console.log(`Removed ${removed} worktree(s)`);

  // List remaining wave branches
  try {
    const { execSync } = require("node:child_process");
    const branches = execSync('git branch --list "feature/*"', {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
    }).trim();
    if (branches) {
      console.log(`\nRemaining feature branches:\n${branches}`);
      console.log('Use "git branch -D <branch>" to remove manually.');
    }
  } catch {}

  // Remove state file
  const { existsSync, unlinkSync, rmSync } = require("node:fs");
  const statePath = resolve(PROJECT_ROOT, ".wave-state.json");
  if (existsSync(statePath)) {
    unlinkSync(statePath);
    console.log("Removed .wave-state.json");
  }

  // Remove log directory
  const logDir = resolve(PROJECT_ROOT, ".wave-logs");
  if (existsSync(logDir)) {
    rmSync(logDir, { recursive: true, force: true });
    console.log("Removed .wave-logs/");
  }

  console.log("\nCleanup complete.");
}

/**
 * Show help text.
 */
function cmdHelp(): void {
  console.log(`
Wave Runner — Agent Orchestration System

Commands:
  launch       Launch a wave of agents to implement features
  resume       Resume a previously stopped wave (restores from .wave-state.json)
  status       Show the status of the current wave
  verify       Run build verification on completed agents
  merge        Merge verified branches into the base branch
  retry        Retry a failed agent
  cleanup      Remove all wave worktrees and tmux sessions

Selection Options (for launch):
  --top-priority N       Select top N features by priority
  --quickest-wins N      Select N features with lowest effort
  --priority <level>     Select all features at a priority level (critical/high/medium/low)
  --difficulty <level>   Select all features at a difficulty level (trivial/easy/medium/hard/very_hard)
  --features "id1,id2"   Select specific features by ID
  --all-ready            Select all ready features

Launch Options:
  --max-concurrent N     Max agents running in parallel (default: ${DEFAULT_MAX_CONCURRENT})
  --model <model>        Model to use (e.g., "anthropic/claude-sonnet-4-20250514")
  --interactive          Use tmux TUI mode instead of headless
  --no-tui               Headless mode without neo-blessed TUI (uses periodic console dashboard)
  --auto-push            Push base branch to origin after all merges complete
  --dry-run              Show what would be launched without launching
  --base-branch <branch> Base branch (default: ${DEFAULT_BASE_BRANCH})
  --max-retries N        Max retries per agent (default: ${DEFAULT_MAX_RETRIES})

Examples:
  bun scripts/wave-runner.ts launch --quickest-wins 3
  bun scripts/wave-runner.ts launch --priority high --interactive
  bun scripts/wave-runner.ts launch --features "dead-code-cleanup,reading-progress-theme" --max-concurrent 2
  bun scripts/wave-runner.ts resume              # pick up where you left off
  bun scripts/wave-runner.ts status
  bun scripts/wave-runner.ts verify
  bun scripts/wave-runner.ts merge
  bun scripts/wave-runner.ts retry dead-code-cleanup
  bun scripts/wave-runner.ts cleanup
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Global error handlers — prevent silent crashes
  process.on("uncaughtException", (err) => {
    console.error(`\n[FATAL] Uncaught exception: ${err.message}`);
    console.error(err.stack);
    // Try to save state before dying
    try {
      const state = loadState(PROJECT_ROOT);
      if (state) saveState(PROJECT_ROOT, state);
    } catch {}
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: any) => {
    console.error(`\n[FATAL] Unhandled rejection: ${reason?.message || reason}`);
    if (reason?.stack) console.error(reason.stack);
    // Try to save state before dying
    try {
      const state = loadState(PROJECT_ROOT);
      if (state) saveState(PROJECT_ROOT, state);
    } catch {}
    process.exit(1);
  });

  const args = parseArgs(process.argv);

  switch (args.command) {
    case "launch":
      await cmdLaunch(args);
      break;
    case "status":
      cmdStatus(args);
      break;
    case "verify":
      await cmdVerify(args);
      break;
    case "merge":
      await cmdMerge(args);
      break;
    case "retry":
      await cmdRetry(args);
      break;
    case "resume":
      await cmdResume(args);
      break;
    case "cleanup":
      cmdCleanup(args);
      break;
    case "help":
    case "--help":
    case "-h":
      cmdHelp();
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      cmdHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
