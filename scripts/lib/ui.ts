/**
 * ui.ts — Terminal dashboard for wave status display.
 *
 * Responsibilities:
 *   - Render a live status table of all agents in a wave
 *   - Show progress indicators, timing, retry counts
 *   - Color-coded status output
 *   - Summary statistics
 */

import type { WaveState, AgentState, AgentStatus } from "./state.js";
import { agentCounts } from "./state.js";
import { formatDuration, parseDurationMinutes } from "./features.js";

// ---------------------------------------------------------------------------
// ANSI Color Helpers
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const FG = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// ---------------------------------------------------------------------------
// Status Colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<AgentStatus, string> = {
  queued: FG.gray,
  installing: FG.cyan,
  running: FG.blue,
  completed: FG.yellow,
  verified: FG.green,
  failed: FG.red,
  merged: FG.magenta,
  retry: FG.yellow,
};

const STATUS_ICONS: Record<AgentStatus, string> = {
  queued: ".",
  installing: ">",
  running: "*",
  completed: "~",
  verified: "+",
  failed: "!",
  merged: "#",
  retry: "?",
};

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

function colorize(text: string, color: string): string {
  return `${color}${text}${RESET}`;
}

function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return " ".repeat(width - text.length) + text;
}

function elapsed(startedAt: string | null): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h${remMins}m`;
}

// ---------------------------------------------------------------------------
// Table Rendering
// ---------------------------------------------------------------------------

/**
 * Render the full wave status dashboard to stdout.
 */
export function renderDashboard(state: WaveState): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(
    `${BOLD}Wave Runner${RESET} ${DIM}${state.wave_id}${RESET}`
  );
  lines.push(
    `${DIM}Base: ${state.base_branch} | Concurrency: ${state.max_concurrent} | Mode: ${state.interactive ? "interactive" : "headless"}${RESET}`
  );
  if (state.model) {
    lines.push(`${DIM}Model: ${state.model}${RESET}`);
  }
  lines.push("");

  // Table header
  const header = [
    pad("", 3),
    pad("Feature", 30),
    pad("Status", 12),
    pad("Activity", 30),
    padLeft("Retries", 8),
    padLeft("Elapsed", 8),
  ].join(" ");
  lines.push(`${BOLD}${header}${RESET}`);
  lines.push("-".repeat(95));

  // Agent rows
  for (const agent of state.agents) {
    const statusColor = STATUS_COLORS[agent.status];
    const icon = STATUS_ICONS[agent.status];

    // Show activity for running agents, otherwise show branch or status hint
    let activityText = "-";
    if (agent.status === "running" && agent.activity) {
      activityText = agent.activity;
    } else if (agent.status === "installing") {
      activityText = "setting up worktree…";
    } else if (agent.status === "retry") {
      activityText = "retrying with errors…";
    } else if (agent.status === "failed" && agent.error) {
      activityText = agent.error.split("\n")[0].slice(0, 28);
    } else if (agent.status === "verified") {
      activityText = "build passed";
    } else if (agent.status === "merged") {
      activityText = agent.branch;
    }

    const row = [
      colorize(pad(`[${icon}]`, 3), statusColor),
      pad(agent.feature_id, 30),
      colorize(pad(agent.status, 12), statusColor),
      (agent.status === "running" ? FG.cyan : DIM) + pad(activityText, 30) + RESET,
      padLeft(
        agent.retries > 0 ? `${agent.retries}/${agent.max_retries}` : "-",
        8
      ),
      padLeft(elapsed(agent.started_at), 8),
    ].join(" ");

    lines.push(row);
  }

  // Summary
  lines.push("-".repeat(95));
  const counts = agentCounts(state);
  const summaryParts: string[] = [];

  if (counts.queued > 0)
    summaryParts.push(colorize(`${counts.queued} queued`, FG.gray));
  if (counts.installing > 0)
    summaryParts.push(colorize(`${counts.installing} installing`, FG.cyan));
  if (counts.running > 0)
    summaryParts.push(colorize(`${counts.running} running`, FG.blue));
  if (counts.completed > 0)
    summaryParts.push(colorize(`${counts.completed} completed`, FG.yellow));
  if (counts.verified > 0)
    summaryParts.push(colorize(`${counts.verified} verified`, FG.green));
  if (counts.failed > 0)
    summaryParts.push(colorize(`${counts.failed} failed`, FG.red));
  if (counts.merged > 0)
    summaryParts.push(colorize(`${counts.merged} merged`, FG.magenta));
  if (counts.retry > 0)
    summaryParts.push(colorize(`${counts.retry} retrying`, FG.yellow));

  lines.push(summaryParts.join(" | "));
  lines.push("");

  return lines.join("\n");
}

/**
 * Print the dashboard to stdout.
 */
export function printDashboard(state: WaveState): void {
  console.log(renderDashboard(state));
}

/**
 * Print a single-line status update for a feature.
 */
export function printAgentUpdate(
  agent: AgentState,
  message: string
): void {
  const statusColor = STATUS_COLORS[agent.status];
  const icon = STATUS_ICONS[agent.status];
  console.log(
    `${colorize(`[${icon}]`, statusColor)} ${pad(agent.feature_id, 28)} ${message}`
  );
}

/**
 * Print a compact summary (for non-interactive/log output).
 */
export function printSummary(state: WaveState): void {
  const counts = agentCounts(state);
  const total = state.agents.length;
  const done = counts.verified + counts.merged;
  console.log(
    `\n${BOLD}Wave ${state.wave_id}${RESET}: ${done}/${total} done, ${counts.running} running, ${counts.failed} failed, ${counts.queued} queued`
  );
}

/**
 * Clear the terminal screen.
 */
export function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

/**
 * Print a feature selection table (for launch preview).
 */
export function printFeatureSelection(
  features: Array<{
    id: string;
    title: string;
    priority: string;
    difficulty: string;
    effort: string;
  }>
): void {
  console.log("");
  console.log(`${BOLD}Selected Features (${features.length}):${RESET}`);
  console.log("");

  const header = [
    pad("#", 4),
    pad("Feature ID", 30),
    pad("Priority", 10),
    pad("Difficulty", 12),
    padLeft("Effort", 8),
    pad("Title", 40),
  ].join(" ");
  console.log(`${BOLD}${header}${RESET}`);
  console.log("-".repeat(108));

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const effortMin = parseDurationMinutes(f.effort);
    const row = [
      pad(`${i + 1}.`, 4),
      pad(f.id, 30),
      pad(f.priority, 10),
      pad(f.difficulty, 12),
      padLeft(formatDuration(effortMin), 8),
      pad(f.title, 40),
    ].join(" ");
    console.log(row);
  }

  console.log("");
}
