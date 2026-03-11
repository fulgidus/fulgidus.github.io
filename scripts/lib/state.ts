/**
 * state.ts — Persistent wave state management.
 *
 * Responsibilities:
 *   - Define the shape of .wave-state.json
 *   - Read/write state atomically
 *   - Generate wave IDs
 *   - Update individual agent state within a wave
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStatus =
  | "queued"
  | "installing"
  | "running"
  | "completed"
  | "verified"
  | "failed"
  | "merged"
  | "retry";

export interface AgentState {
  feature_id: string;
  branch: string;
  worktree: string;
  session_id: string | null;
  pid: number | null;
  status: AgentStatus;
  activity: string | null;
  activity_updated_at: string | null;
  retries: number;
  max_retries: number;
  started_at: string | null;
  completed_at: string | null;
  build_passed: boolean | null;
  build_output: string | null;
  error: string | null;
  /** Estimated effort in milliseconds (from feature's ISO 8601 duration) */
  effort_estimate_ms: number | null;
}

export interface WaveState {
  wave_id: string;
  base_branch: string;
  started_at: string;
  updated_at: string;
  max_concurrent: number;
  model: string | null;
  interactive: boolean;
  agents: AgentState[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATE_FILE = ".wave-state.json";

// ---------------------------------------------------------------------------
// Wave ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique wave ID based on current timestamp.
 * Format: wave-YYYY-MM-DD-NNN
 */
export function generateWaveId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const seq = String(now.getHours() * 60 + now.getMinutes()).padStart(3, "0");
  return `wave-${date}-${seq}`;
}

// ---------------------------------------------------------------------------
// State Path
// ---------------------------------------------------------------------------

function statePath(projectRoot: string): string {
  return resolve(projectRoot, STATE_FILE);
}

// ---------------------------------------------------------------------------
// Read State
// ---------------------------------------------------------------------------

/**
 * Load the current wave state from disk. Returns null if no state file exists.
 */
export function loadState(projectRoot: string): WaveState | null {
  const p = statePath(projectRoot);
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, "utf-8");
    return JSON.parse(raw) as WaveState;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write State
// ---------------------------------------------------------------------------

/**
 * Save wave state to disk atomically (write to tmp then rename).
 */
export function saveState(projectRoot: string, state: WaveState): void {
  state.updated_at = new Date().toISOString();
  const p = statePath(projectRoot);
  const tmp = p + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf-8");
  // Atomic rename
  const { renameSync } = require("node:fs");
  renameSync(tmp, p);
}

// ---------------------------------------------------------------------------
// State Mutations
// ---------------------------------------------------------------------------

/**
 * Create a fresh wave state.
 */
export function createWaveState(opts: {
  baseBranch: string;
  maxConcurrent: number;
  model: string | null;
  interactive: boolean;
}): WaveState {
  return {
    wave_id: generateWaveId(),
    base_branch: opts.baseBranch,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    max_concurrent: opts.maxConcurrent,
    model: opts.model,
    interactive: opts.interactive,
    agents: [],
  };
}

/**
 * Create an initial agent state for a feature.
 */
export function createAgentState(
  featureId: string,
  branch: string,
  worktreePath: string,
  maxRetries: number = 2
): AgentState {
  return {
    feature_id: featureId,
    branch,
    worktree: worktreePath,
    session_id: null,
    pid: null,
    status: "queued",
    activity: null,
    activity_updated_at: null,
    retries: 0,
    max_retries: maxRetries,
    started_at: null,
    completed_at: null,
    build_passed: null,
    build_output: null,
    error: null,
    effort_estimate_ms: null,
  };
}

/**
 * Find an agent state by feature ID.
 */
export function getAgent(
  state: WaveState,
  featureId: string
): AgentState | undefined {
  return state.agents.find((a) => a.feature_id === featureId);
}

/**
 * Update an agent's state fields.
 */
export function updateAgent(
  state: WaveState,
  featureId: string,
  updates: Partial<AgentState>
): void {
  const agent = state.agents.find((a) => a.feature_id === featureId);
  if (!agent) throw new Error(`Agent not found for feature: ${featureId}`);
  Object.assign(agent, updates);
}

/**
 * Get counts of agents by status.
 */
export function agentCounts(state: WaveState): Record<AgentStatus, number> {
  const counts: Record<AgentStatus, number> = {
    queued: 0,
    installing: 0,
    running: 0,
    completed: 0,
    verified: 0,
    failed: 0,
    merged: 0,
    retry: 0,
  };
  for (const a of state.agents) {
    counts[a.status]++;
  }
  return counts;
}

/**
 * Get agents that are currently running or installing.
 */
export function activeAgents(state: WaveState): AgentState[] {
  return state.agents.filter(
    (a) => a.status === "running" || a.status === "installing"
  );
}

/**
 * Get agents that are queued and ready to be launched.
 */
export function queuedAgents(state: WaveState): AgentState[] {
  return state.agents.filter((a) => a.status === "queued");
}

/**
 * Check if the wave is fully complete (no queued, installing, running, or retry agents).
 */
export function isWaveComplete(state: WaveState): boolean {
  return state.agents.every(
    (a) =>
      a.status === "completed" ||
      a.status === "verified" ||
      a.status === "failed" ||
      a.status === "merged"
  );
}
