/**
 * tui.ts — Blessed-based TUI dashboard for wave-runner.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ Header: Wave ID, base branch, mode, model   │
 *   ├──────────────────────────┬──────────────────┤
 *   │ Agent Table              │ Preview Pane     │
 *   │ (selectable rows with    │ (parsed activity │
 *   │  status, activity,       │  stream for the  │
 *   │  progress bars, elapsed) │  selected agent) │
 *   ├──────────────────────────┴──────────────────┤
 *   │ Status bar: keybinds + summary counts       │
 *   └─────────────────────────────────────────────┘
 *
 * Keybinds:
 *   Up/Down   — navigate agent list
 *   Enter     — tmux attach to selected agent (interactive mode)
 *   b         — show build log for selected agent
 *   p         — toggle auto-scroll (pause/resume)
 *   q / C-c   — quit
 */

import blessed from "neo-blessed";
import type { Widgets } from "neo-blessed";
import type { WaveState, AgentState, AgentStatus } from "./state.js";
import { agentCounts } from "./state.js";
import type { ProcessMonitor, ActivityEntry } from "./monitor.js";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TUIOptions {
  state: WaveState;
  monitor: ProcessMonitor;
  onQuit: () => void;
  /** Whether the wave is running in interactive (tmux) mode. */
  interactive?: boolean;
  /** Project root path (for locating log files). */
  projectRoot: string;
}

// ---------------------------------------------------------------------------
// Color Map
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<AgentStatus, string> = {
  queued: "gray",
  installing: "cyan",
  running: "blue",
  completed: "yellow",
  verified: "green",
  failed: "red",
  merged: "magenta",
  retry: "yellow",
};

const STATUS_ICONS: Record<AgentStatus, string> = {
  queued: "·",
  installing: "⟳",
  running: "●",
  completed: "○",
  verified: "✓",
  failed: "✗",
  merged: "◆",
  retry: "↻",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function elapsed(startedAt: string | null): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const diffMs = Date.now() - start;
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h${mins % 60}m`;
}

function progressBar(
  elapsedMs: number,
  estimateMs: number,
  width: number = 10
): string {
  if (estimateMs <= 0) return "░".repeat(width);
  const ratio = Math.min(elapsedMs / estimateMs, 1);
  const filled = Math.round(ratio * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function statusTag(status: AgentStatus): string {
  const icon = STATUS_ICONS[status];
  const color = STATUS_COLORS[status];
  return `{${color}-fg}${icon} ${status}{/${color}-fg}`;
}

// ---------------------------------------------------------------------------
// TUI Dashboard Class
// ---------------------------------------------------------------------------

export class WaveTUI {
  private screen: Widgets.Screen;
  private headerBox: Widgets.BoxElement;
  private agentList: Widgets.ListElement;
  private previewBox: Widgets.Log;
  private statusBar: Widgets.BoxElement;
  private buildLogBox: Widgets.Log;

  private state: WaveState;
  private monitor: ProcessMonitor;
  private onQuit: () => void;
  private interactive: boolean;
  private projectRoot: string;

  private selectedIndex: number = 0;
  private autoScroll: boolean = true;
  private showingBuildLog: boolean = false;
  private showingLogFile: boolean = false;
  private logFileBox: Widgets.Log | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  /** Saved originals for console interception */
  private origConsoleLog: typeof console.log = console.log;
  private origConsoleError: typeof console.error = console.error;
  private origConsoleWarn: typeof console.warn = console.warn;
  /** System messages captured while TUI is active */
  private systemMessages: ActivityEntry[] = [];

  constructor(opts: TUIOptions) {
    this.state = opts.state;
    this.monitor = opts.monitor;
    this.onQuit = opts.onQuit;
    this.interactive = opts.interactive ?? false;
    this.projectRoot = opts.projectRoot;

    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: `Wave Runner — ${opts.state.wave_id}`,
      fullUnicode: true,
    });

    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      tags: true,
      style: {
        fg: "white",
        bg: "black",
      },
    });

    // Agent list (left pane)
    this.agentList = blessed.list({
      top: 3,
      left: 0,
      width: "55%",
      height: "100%-6",
      tags: true,
      scrollable: true,
      mouse: true,
      keys: true,
      vi: true,
      border: {
        type: "line",
      },
      style: {
        border: { fg: "gray" },
        selected: {
          bg: "blue",
          fg: "white",
          bold: true,
        },
        item: {
          fg: "white",
        },
      },
      label: " Agents ",
    });

    // Preview pane (right pane)
    this.previewBox = blessed.log({
      top: 3,
      left: "55%",
      width: "45%",
      height: "100%-6",
      tags: true,
      scrollable: true,
      mouse: true,
      keys: false,
      scrollbar: {
        ch: "│",
        style: { fg: "cyan" },
      },
      border: {
        type: "line",
      },
      style: {
        border: { fg: "gray" },
        fg: "white",
      },
      label: " Activity ",
    });

    // Build log overlay (hidden by default)
    this.buildLogBox = blessed.log({
      top: 3,
      left: "10%",
      width: "80%",
      height: "100%-6",
      tags: true,
      scrollable: true,
      mouse: true,
      keys: true,
      scrollbar: {
        ch: "│",
        style: { fg: "yellow" },
      },
      border: {
        type: "line",
      },
      style: {
        border: { fg: "yellow" },
        fg: "white",
      },
      label: " Build Log ",
      hidden: true,
    });

    // Status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: "100%",
      height: 3,
      tags: true,
      style: {
        fg: "white",
        bg: "black",
      },
    });

    // Assemble
    this.screen.append(this.headerBox);
    this.screen.append(this.agentList);
    this.screen.append(this.previewBox);
    this.screen.append(this.buildLogBox);
    this.screen.append(this.statusBar);

    // Focus the agent list
    this.agentList.focus();

    // Bind keys
    this.bindKeys();
  }

  // -------------------------------------------------------------------------
  // Key Bindings
  // -------------------------------------------------------------------------

  private bindKeys(): void {
    // Quit
    this.screen.key(["q", "C-c"], () => {
      this.stop();
      this.onQuit();
    });

    // Navigate agent list
    this.agentList.on("select item", (_item: any, index: number) => {
      this.selectedIndex = index;
      this.refreshPreview();
    });

    // Enter — tmux attach
    this.screen.key(["enter"], () => {
      this.tmuxAttach();
    });

    // b — toggle build log
    this.screen.key(["b"], () => {
      this.toggleBuildLog();
    });

    // p — toggle auto-scroll
    this.screen.key(["p"], () => {
      this.autoScroll = !this.autoScroll;
      this.refreshStatusBar();
    });

    // Escape — close build log or log file overlay
    this.screen.key(["escape"], () => {
      if (this.showingBuildLog) {
        this.showingBuildLog = false;
        this.buildLogBox.hide();
        this.agentList.focus();
        this.screen.render();
      } else if (this.showingLogFile && this.logFileBox) {
        this.showingLogFile = false;
        this.logFileBox.destroy();
        this.logFileBox = null;
        this.agentList.focus();
        this.screen.render();
      }
    });
  }

  // -------------------------------------------------------------------------
  // Start / Stop
  // -------------------------------------------------------------------------

  start(): void {
    this.interceptConsole();
    this.refresh();
    this.screen.render();

    // Auto-refresh every 2 seconds
    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, 2000);
  }

  stop(): void {
    this.restoreConsole();
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.screen.destroy();
  }

  /**
   * Intercept console.log/error/warn so they don't corrupt the TUI.
   * Messages are captured into systemMessages and shown in the preview
   * when no specific agent is producing activity.
   */
  private interceptConsole(): void {
    this.origConsoleLog = console.log;
    this.origConsoleError = console.error;
    this.origConsoleWarn = console.warn;

    const capture = (...args: any[]) => {
      const text = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      // Strip ANSI codes for clean TUI display
      const clean = text.replace(/\x1b\[[0-9;]*m/g, "");
      if (!clean.trim()) return;
      this.systemMessages.push({
        timestamp: new Date().toISOString().slice(11, 19),
        text: clean,
      });
      // Keep bounded
      if (this.systemMessages.length > 200) {
        this.systemMessages.splice(0, this.systemMessages.length - 200);
      }
    };

    console.log = capture;
    console.error = capture;
    console.warn = capture;
  }

  /**
   * Restore original console methods.
   */
  private restoreConsole(): void {
    console.log = this.origConsoleLog;
    console.error = this.origConsoleError;
    console.warn = this.origConsoleWarn;
  }

  /**
   * Update the state reference (called from the monitoring loop).
   */
  updateState(state: WaveState): void {
    this.state = state;
  }

  // -------------------------------------------------------------------------
  // Refresh Logic
  // -------------------------------------------------------------------------

  private refresh(): void {
    this.refreshHeader();
    this.refreshAgentList();
    this.refreshPreview();
    this.refreshStatusBar();
    this.screen.render();
  }

  private refreshHeader(): void {
    const s = this.state;
    const counts = agentCounts(s);
    const total = s.agents.length;
    const done = counts.verified + counts.merged;

    let line1 = ` {bold}Wave Runner{/bold} {gray-fg}${s.wave_id}{/gray-fg}`;
    line1 += `  {gray-fg}│{/gray-fg}  Base: {cyan-fg}${s.base_branch}{/cyan-fg}`;
    line1 += `  {gray-fg}│{/gray-fg}  Mode: ${s.interactive ? "{green-fg}interactive{/green-fg}" : "{blue-fg}headless{/blue-fg}"}`;
    if (s.model) {
      line1 += `  {gray-fg}│{/gray-fg}  Model: {yellow-fg}${s.model}{/yellow-fg}`;
    }

    let line2 = ` Progress: {green-fg}${done}{/green-fg}/{white-fg}${total}{/white-fg}`;
    if (counts.running > 0) line2 += `  {blue-fg}${counts.running} running{/blue-fg}`;
    if (counts.failed > 0) line2 += `  {red-fg}${counts.failed} failed{/red-fg}`;
    if (counts.queued > 0) line2 += `  {gray-fg}${counts.queued} queued{/gray-fg}`;
    if (counts.retry > 0) line2 += `  {yellow-fg}${counts.retry} retrying{/yellow-fg}`;

    this.headerBox.setContent(`${line1}\n${line2}`);
  }

  private refreshAgentList(): void {
    const items: string[] = [];

    for (let i = 0; i < this.state.agents.length; i++) {
      const a = this.state.agents[i];
      const color = STATUS_COLORS[a.status];
      const icon = STATUS_ICONS[a.status];

      // Feature ID (padded)
      const fid = a.feature_id.length > 24
        ? a.feature_id.slice(0, 23) + "…"
        : a.feature_id.padEnd(24);

      // Status
      const st = `{${color}-fg}${icon} ${a.status.padEnd(10)}{/${color}-fg}`;

      // Progress bar
      let pbar = "";
      if (a.status === "running" && a.started_at) {
        const elapsedMs = Date.now() - new Date(a.started_at).getTime();
        // Use actual effort estimate from feature data, fallback to 1h
        const estimateMs = a.effort_estimate_ms ?? 60 * 60 * 1000;
        pbar = ` {cyan-fg}${progressBar(elapsedMs, estimateMs, 8)}{/cyan-fg}`;
      } else if (a.status === "verified" || a.status === "merged") {
        pbar = ` {green-fg}${"█".repeat(8)}{/green-fg}`;
      } else if (a.status === "failed") {
        pbar = ` {red-fg}${"█".repeat(8)}{/red-fg}`;
      }

      // Activity (for running agents)
      let act = "";
      if (a.status === "running" && a.activity) {
        const actText = a.activity.length > 25
          ? a.activity.slice(0, 24) + "…"
          : a.activity;
        act = ` {cyan-fg}${actText}{/cyan-fg}`;
      } else if (a.status === "installing") {
        act = " {cyan-fg}setting up…{/cyan-fg}";
      }

      // Elapsed
      const el = elapsed(a.started_at);

      // Retries
      const retries = a.retries > 0
        ? ` {yellow-fg}↻${a.retries}{/yellow-fg}`
        : "";

      items.push(` ${fid} ${st}${pbar}${act}${retries} {gray-fg}${el}{/gray-fg}`);
    }

    // Preserve selection
    const prevSelected = this.selectedIndex;
    this.agentList.setItems(items as any);
    if (prevSelected < items.length) {
      this.agentList.select(prevSelected);
    }
  }

  private refreshPreview(): void {
    const agent = this.state.agents[this.selectedIndex];
    if (!agent) {
      this.previewBox.setContent("{gray-fg}No agent selected{/gray-fg}");
      return;
    }

    // Update label
    this.previewBox.setLabel(` ${agent.feature_id} — Activity `);

    // Get activity log from monitor
    const log = this.monitor.getActivityLog(agent.feature_id);

    // Also include system messages (build verification, etc.)
    // that mention this agent's feature_id
    const relevantSys = this.systemMessages.filter(
      (m) => m.text.includes(agent.feature_id)
    );

    if (log.length === 0 && relevantSys.length === 0) {
      this.previewBox.setContent(
        "{gray-fg}No activity yet. Waiting for agent output…{/gray-fg}"
      );
      return;
    }

    // Format log entries
    const lines: string[] = [];
    for (const entry of log) {
      lines.push(this.formatActivityLine(entry));
    }

    // Append relevant system messages
    if (relevantSys.length > 0) {
      lines.push("");
      lines.push("{yellow-fg}-- system --{/yellow-fg}");
      for (const entry of relevantSys) {
        const ts = `{gray-fg}${entry.timestamp}{/gray-fg}`;
        lines.push(`${ts} {yellow-fg}${entry.text}{/yellow-fg}`);
      }
    }

    this.previewBox.setContent(lines.join("\n"));

    // Auto-scroll to bottom
    if (this.autoScroll) {
      this.previewBox.setScrollPerc(100);
    }
  }

  private formatActivityLine(entry: ActivityEntry): string {
    const ts = `{gray-fg}${entry.timestamp}{/gray-fg}`;
    let text = entry.text;

    // Color-code different line types
    if (text.startsWith(">>")) {
      text = `{cyan-fg}${text}{/cyan-fg}`;
    } else if (text.startsWith("!!")) {
      text = `{red-fg}${text}{/red-fg}`;
    } else if (text.startsWith("--")) {
      text = `{green-fg}${text}{/green-fg}`;
    } else if (text.startsWith("[stderr]")) {
      text = `{red-fg}${text}{/red-fg}`;
    } else if (text.startsWith("[raw]")) {
      text = `{gray-fg}${text}{/gray-fg}`;
    } else if (text.startsWith("   ")) {
      text = `{white-fg}${text}{/white-fg}`;
    }

    return `${ts} ${text}`;
  }

  private refreshStatusBar(): void {
    const scrollStatus = this.autoScroll
      ? "{green-fg}auto-scroll{/green-fg}"
      : "{yellow-fg}paused{/yellow-fg}";

    const agent = this.state.agents[this.selectedIndex];
    const agentInfo = agent
      ? `{gray-fg}Selected: {white-fg}${agent.feature_id}{/white-fg}{/gray-fg}`
      : "";

    const enterHint = this.interactive
      ? "{gray-fg}Enter{/gray-fg} tmux attach"
      : "{gray-fg}Enter{/gray-fg} view log";

    const line1 = ` {bold}Keys:{/bold} {gray-fg}↑↓{/gray-fg} navigate  ${enterHint}  {gray-fg}b{/gray-fg} build log  {gray-fg}p{/gray-fg} ${scrollStatus}  {gray-fg}q{/gray-fg} quit`;
    const line2 = ` ${agentInfo}`;

    this.statusBar.setContent(`${line1}\n${line2}`);
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  private tmuxAttach(): void {
    const agent = this.state.agents[this.selectedIndex];
    if (!agent) return;

    if (!this.interactive) {
      // Headless mode — show the raw log file in an overlay
      this.showLogFile(agent);
      return;
    }

    const sessionName = `wave-${agent.feature_id}`;

    // Check if tmux session exists
    try {
      execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`, {
        stdio: "pipe",
      });
    } catch {
      // No session — show message in preview
      this.monitor.activityLogs.get(agent.feature_id)?.push({
        timestamp: new Date().toISOString().slice(11, 19),
        text: `!! No tmux session '${sessionName}' found`,
      });
      this.refreshPreview();
      this.screen.render();
      return;
    }

    // Detach from blessed, attach to tmux
    this.restoreConsole();
    this.screen.destroy();
    try {
      execSync(`tmux attach -t "${sessionName}"`, {
        stdio: "inherit",
      });
    } catch {
      // User detached from tmux — resume TUI
    }

    // Re-create screen after returning from tmux
    this.recreateScreen();
  }

  /**
   * Show the raw log file for an agent in an overlay (headless mode).
   */
  private showLogFile(agent: AgentState): void {
    if (this.showingLogFile) {
      // Toggle off
      this.showingLogFile = false;
      if (this.logFileBox) {
        this.logFileBox.destroy();
        this.logFileBox = null;
      }
      this.agentList.focus();
      this.screen.render();
      return;
    }

    const logPath = resolve(this.projectRoot, ".wave-logs", `${agent.feature_id}.log`);
    let content: string;
    try {
      content = require("node:fs").readFileSync(logPath, "utf-8");
      if (!content.trim()) {
        content = "{gray-fg}Log file is empty. Agent may not have started producing output yet.{/gray-fg}";
      }
    } catch {
      content = "{gray-fg}No log file found at " + logPath + "{/gray-fg}";
    }

    // Create overlay
    this.logFileBox = blessed.log({
      top: 3,
      left: "5%",
      width: "90%",
      height: "100%-6",
      tags: true,
      scrollable: true,
      mouse: true,
      keys: true,
      scrollbar: {
        ch: "│",
        style: { fg: "cyan" },
      },
      border: {
        type: "line",
      },
      style: {
        border: { fg: "cyan" },
        fg: "white",
      },
      label: ` Log — ${agent.feature_id} (Esc to close) `,
    });

    this.screen.append(this.logFileBox);

    // Truncate to last 200 lines to keep TUI responsive
    const lines = content.split("\n");
    const truncated = lines.length > 200
      ? lines.slice(-200).join("\n")
      : content;
    this.logFileBox.setContent(truncated);
    this.logFileBox.setScrollPerc(100);
    this.logFileBox.focus();
    this.showingLogFile = true;
    this.screen.render();
  }

  private toggleBuildLog(): void {
    const agent = this.state.agents[this.selectedIndex];
    if (!agent) return;

    if (this.showingBuildLog) {
      this.showingBuildLog = false;
      this.buildLogBox.hide();
      this.agentList.focus();
    } else {
      this.showingBuildLog = true;
      this.buildLogBox.setLabel(` Build Log — ${agent.feature_id} `);

      if (agent.build_output) {
        this.buildLogBox.setContent(agent.build_output);
      } else if (agent.build_passed === true) {
        this.buildLogBox.setContent("{green-fg}Build passed — no errors.{/green-fg}");
      } else if (agent.build_passed === false) {
        this.buildLogBox.setContent("{red-fg}Build failed — no output captured.{/red-fg}");
      } else {
        this.buildLogBox.setContent("{gray-fg}No build has been run yet.{/gray-fg}");
      }

      this.buildLogBox.show();
      this.buildLogBox.focus();
    }
    this.screen.render();
  }

  /**
   * Re-create the screen after returning from tmux attach.
   * Blessed can't resume after destroy, so we rebuild everything.
   */
  private recreateScreen(): void {
    // Re-create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: `Wave Runner — ${this.state.wave_id}`,
      fullUnicode: true,
    });

    // Re-create all widgets
    this.headerBox = blessed.box({
      top: 0, left: 0, width: "100%", height: 3,
      tags: true,
      style: { fg: "white", bg: "black" },
    });

    this.agentList = blessed.list({
      top: 3, left: 0, width: "55%", height: "100%-6",
      tags: true, scrollable: true, mouse: true, keys: true, vi: true,
      border: { type: "line" },
      style: {
        border: { fg: "gray" },
        selected: { bg: "blue", fg: "white", bold: true },
        item: { fg: "white" },
      },
      label: " Agents ",
    });

    this.previewBox = blessed.log({
      top: 3, left: "55%", width: "45%", height: "100%-6",
      tags: true, scrollable: true, mouse: true, keys: false,
      scrollbar: { ch: "│", style: { fg: "cyan" } },
      border: { type: "line" },
      style: { border: { fg: "gray" }, fg: "white" },
      label: " Activity ",
    });

    this.buildLogBox = blessed.log({
      top: 3, left: "10%", width: "80%", height: "100%-6",
      tags: true, scrollable: true, mouse: true, keys: true,
      scrollbar: { ch: "│", style: { fg: "yellow" } },
      border: { type: "line" },
      style: { border: { fg: "yellow" }, fg: "white" },
      label: " Build Log ",
      hidden: true,
    });

    this.statusBar = blessed.box({
      bottom: 0, left: 0, width: "100%", height: 3,
      tags: true,
      style: { fg: "white", bg: "black" },
    });

    this.screen.append(this.headerBox);
    this.screen.append(this.agentList);
    this.screen.append(this.previewBox);
    this.screen.append(this.buildLogBox);
    this.screen.append(this.statusBar);

    this.agentList.focus();
    this.showingBuildLog = false;
    this.showingLogFile = false;
    this.logFileBox = null;
    this.interceptConsole();
    this.bindKeys();
    this.refresh();
  }
}
