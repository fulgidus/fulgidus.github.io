/**
 * monitor.ts — Parse JSON events from opencode and detect completion/failure.
 *
 * Responsibilities:
 *   - Parse newline-delimited JSON events from opencode stdout
 *   - Detect session completion (agent finished)
 *   - Detect session ID from events
 *   - Detect errors and failures
 *   - Provide a monitoring loop for headless processes
 *   - Write per-agent raw log files for diagnostics
 *   - Maintain per-agent parsed activity log for TUI preview
 *
 * OpenCode event format (--format json):
 *   step_start  → { type: "step_start", sessionID, part: { type: "step-start" } }
 *   tool_use    → { type: "tool_use", sessionID, part: { tool, callID, state: { status, input, output, error } } }
 *   text        → { type: "text", sessionID, part: { text: "..." } }
 *   step_finish → { type: "step_finish", sessionID, part: { reason: "stop"|"tool-calls", cost, tokens } }
 */

import type { ChildProcess } from "node:child_process";
import type { AgentState, WaveState } from "./state.js";
import { updateAgent, saveState } from "./state.js";
import { isProcessRunning } from "./launcher.js";
import { mkdirSync, appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types — OpenCode JSON Events
// ---------------------------------------------------------------------------

export interface OpenCodeEvent {
  type: string;
  sessionID?: string;
  timestamp?: number;
  part?: {
    type?: string;
    tool?: string;
    callID?: string;
    text?: string;
    reason?: string;
    cost?: number;
    tokens?: {
      total: number;
      input: number;
      output: number;
      reasoning: number;
    };
    state?: {
      status?: string;
      input?: Record<string, any>;
      output?: string;
      error?: string;
    };
  };
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Event Parser
// ---------------------------------------------------------------------------

export interface ParsedOutput {
  sessionId: string | null;
  completed: boolean;
  errored: boolean;
  lastError: string | null;
  events: OpenCodeEvent[];
}

export function parseEvents(rawOutput: string): ParsedOutput {
  const result: ParsedOutput = {
    sessionId: null,
    completed: false,
    errored: false,
    lastError: null,
    events: [],
  };

  const lines = rawOutput.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as OpenCodeEvent;
      result.events.push(event);

      // Session ID is on every event at top level
      if (event.sessionID && !result.sessionId) {
        result.sessionId = event.sessionID;
      }

      // Completion: step_finish with reason "stop" (no more tool calls)
      if (
        event.type === "step_finish" &&
        event.part?.reason === "stop"
      ) {
        result.completed = true;
      }

      // Tool errors
      if (
        event.type === "tool_use" &&
        event.part?.state?.status === "error"
      ) {
        result.errored = true;
        result.lastError = event.part.state.error ?? "unknown tool error";
      }
    } catch {
      // Not valid JSON — skip
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Activity Extraction
// ---------------------------------------------------------------------------

function shortPath(fullPath: string | undefined, maxLen: number = 30): string {
  if (!fullPath) return "";
  const parts = fullPath.replace(/^\/+/, "").split("/");
  const short =
    parts.length > 1
      ? parts.slice(-2).join("/")
      : parts[parts.length - 1];
  if (short.length <= maxLen) return short;
  const fname = parts[parts.length - 1];
  return fname.length <= maxLen ? fname : fname.slice(0, maxLen - 1) + "\u2026";
}

function shortCmd(cmd: string | undefined, maxLen: number = 30): string {
  if (!cmd) return "";
  const first = cmd.split("\n")[0].trim();
  if (first.length <= maxLen) return first;
  return first.slice(0, maxLen - 1) + "\u2026";
}

/**
 * Map an OpenCode event to a human-readable activity string.
 * Returns null if the event doesn't represent a meaningful activity change.
 */
export function extractActivity(event: OpenCodeEvent): string | null {
  switch (event.type) {
    case "step_start":
      return "thinking\u2026";

    case "tool_use": {
      const toolName = (event.part?.tool ?? "").toLowerCase();
      const input = event.part?.state?.input ?? {};
      const status = event.part?.state?.status ?? "";

      // Show error status
      if (status === "error") {
        return `${toolName}: error`;
      }

      switch (toolName) {
        case "read":
          return `reading ${shortPath(input.filePath ?? input.path)}`;
        case "write":
          return `writing ${shortPath(input.filePath ?? input.path)}`;
        case "edit":
          return `editing ${shortPath(input.filePath ?? input.path)}`;
        case "bash":
        case "command":
        case "terminal":
          return `$ ${shortCmd(input.command ?? input.cmd)}`;
        case "glob":
          return `finding: ${shortPath(input.pattern)}`;
        case "grep":
        case "search":
          return `searching: ${(input.pattern ?? "").slice(0, 25)}`;
        case "task":
          return "delegating task\u2026";
        case "webfetch":
        case "web_fetch":
          return "fetching URL\u2026";
        case "todowrite":
        case "todo_write":
          return "planning\u2026";
        case "question":
          return "asking question\u2026";
        case "jcodemunch_index_folder":
        case "jcodemunch_index_repo":
          return "indexing code\u2026";
        case "jcodemunch_search_symbols":
        case "jcodemunch_search_text":
          return "searching symbols\u2026";
        case "jcodemunch_get_file_outline":
          return `outlining ${shortPath(input.file_path)}`;
        case "jcodemunch_get_symbol":
        case "jcodemunch_get_symbols":
          return "reading symbol\u2026";
        default:
          return `tool: ${toolName}`;
      }
    }

    case "text":
      return "responding\u2026";

    case "step_finish":
      if (event.part?.reason === "stop") return "done";
      if (event.part?.reason === "tool-calls") return null; // about to call tools
      return null;

    default:
      return null;
  }
}

/**
 * Format an event into a human-readable log line for the activity stream.
 * Returns null for events not worth showing.
 */
export function formatEventForLog(event: OpenCodeEvent): string | null {
  switch (event.type) {
    case "step_start":
      return "-- step started";

    case "tool_use": {
      const toolName = event.part?.tool ?? "unknown";
      const input = event.part?.state?.input ?? {};
      const status = event.part?.state?.status ?? "";
      const output = event.part?.state?.output ?? "";
      const error = event.part?.state?.error ?? "";

      // Build tool call line
      let line = `>> ${toolName}`;
      switch (toolName.toLowerCase()) {
        case "read":
          line = `>> read ${shortPath(input.filePath ?? input.path, 50)}`;
          break;
        case "write":
          line = `>> write ${shortPath(input.filePath ?? input.path, 50)}`;
          break;
        case "edit":
          line = `>> edit ${shortPath(input.filePath ?? input.path, 50)}`;
          break;
        case "bash":
        case "command":
          line = `>> $ ${shortCmd(input.command ?? input.cmd, 60)}`;
          break;
        case "glob":
          line = `>> glob ${input.pattern ?? ""}`;
          break;
        case "grep":
          line = `>> grep "${(input.pattern ?? "").slice(0, 30)}"`;
          break;
        case "task":
          line = `>> task: ${(input.description ?? input.prompt ?? "").slice(0, 50)}`;
          break;
      }

      // Add result preview if completed
      if (status === "completed" && output) {
        const preview = output.split("\n")[0].slice(0, 80);
        return `${line}\n   ${preview}${output.length > 80 ? "\u2026" : ""}`;
      }
      if (status === "error" && error) {
        return `${line}\n!! ${error.slice(0, 100)}`;
      }
      return line;
    }

    case "text": {
      const text = event.part?.text ?? "";
      if (!text.trim()) return null;
      // Show first meaningful line of assistant text
      const firstLine = text.split("\n").find((l: string) => l.trim())?.trim() ?? "";
      if (firstLine.length === 0) return null;
      return `   ${firstLine.slice(0, 120)}${firstLine.length > 120 ? "\u2026" : ""}`;
    }

    case "step_finish": {
      const reason = event.part?.reason ?? "";
      const tokens = event.part?.tokens;
      if (reason === "stop") {
        const tokStr = tokens
          ? ` (${tokens.input}in/${tokens.output}out)`
          : "";
        return `-- done${tokStr}`;
      }
      return null; // "tool-calls" reason = intermediate, skip
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Per-agent Activity Log (in-memory ring buffer for TUI)
// ---------------------------------------------------------------------------

export interface ActivityEntry {
  timestamp: string;
  text: string;
}

const MAX_ACTIVITY_LINES = 500;

// ---------------------------------------------------------------------------
// Process Monitor
// ---------------------------------------------------------------------------

export interface MonitorCallbacks {
  onSessionId?: (featureId: string, sessionId: string) => void;
  onComplete?: (featureId: string) => void;
  onError?: (featureId: string, error: string) => void;
  onOutput?: (featureId: string, data: string) => void;
  onActivity?: (featureId: string, activity: string) => void;
}

interface MonitoredProcess {
  featureId: string;
  process: ChildProcess;
  stdout: string;
  stderr: string;
  sessionId: string | null;
  done: boolean;
  lineBuffer: string;
  /** Track whether we've seen the final step_finish with reason=stop */
  sawFinalStop: boolean;
}

/**
 * Monitor a set of headless opencode processes.
 * Collects stdout, parses events, and calls callbacks on state changes.
 * Also writes per-agent log files and maintains activity buffers for the TUI.
 */
export class ProcessMonitor {
  private processes: Map<string, MonitoredProcess> = new Map();
  private callbacks: MonitorCallbacks;
  private projectRoot: string;
  private logDir: string;
  /** Per-agent activity log for TUI preview pane */
  public activityLogs: Map<string, ActivityEntry[]> = new Map();

  constructor(projectRoot: string, callbacks: MonitorCallbacks = {}) {
    this.projectRoot = projectRoot;
    this.callbacks = callbacks;
    this.logDir = resolve(projectRoot, ".wave-logs");
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Append to the in-memory activity log for a feature.
   */
  private pushActivity(featureId: string, text: string): void {
    if (!this.activityLogs.has(featureId)) {
      this.activityLogs.set(featureId, []);
    }
    const log = this.activityLogs.get(featureId)!;
    // Support multi-line entries (from formatEventForLog)
    for (const line of text.split("\n")) {
      log.push({ timestamp: new Date().toISOString().slice(11, 19), text: line });
    }
    // Ring buffer — keep last N entries
    if (log.length > MAX_ACTIVITY_LINES) {
      log.splice(0, log.length - MAX_ACTIVITY_LINES);
    }
  }

  /**
   * Write raw data to the per-agent log file on disk.
   */
  private writeLog(featureId: string, data: string): void {
    try {
      const logFile = resolve(this.logDir, `${featureId}.log`);
      appendFileSync(logFile, data);
    } catch {
      // Non-critical — don't crash if logging fails
    }
  }

  /**
   * Get activity log entries for a feature.
   */
  getActivityLog(featureId: string): ActivityEntry[] {
    return this.activityLogs.get(featureId) ?? [];
  }

  /**
   * Add a process to monitor.
   */
  addProcess(featureId: string, child: ChildProcess): void {
    const monitored: MonitoredProcess = {
      featureId,
      process: child,
      stdout: "",
      stderr: "",
      sessionId: null,
      done: false,
      lineBuffer: "",
      sawFinalStop: false,
    };

    this.pushActivity(featureId, "-- agent process started");
    this.writeLog(featureId, `[wave-runner] Process started at ${new Date().toISOString()}\n`);

    child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      monitored.stdout += chunk;
      this.callbacks.onOutput?.(featureId, chunk);
      this.writeLog(featureId, chunk);

      // Parse individual JSON lines
      monitored.lineBuffer += chunk;
      const lines = monitored.lineBuffer.split("\n");
      monitored.lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed) as OpenCodeEvent;

          // Extract session ID (present on every event)
          if (!monitored.sessionId && event.sessionID) {
            monitored.sessionId = event.sessionID;
            this.callbacks.onSessionId?.(featureId, event.sessionID);
            this.pushActivity(featureId, `-- session: ${event.sessionID}`);
          }

          // Extract activity label for the status table
          const activity = extractActivity(event);
          if (activity) {
            this.callbacks.onActivity?.(featureId, activity);
          }

          // Extract formatted log line for the preview pane
          const logLine = formatEventForLog(event);
          if (logLine) {
            this.pushActivity(featureId, logLine);
          }

          // Detect final completion: step_finish with reason "stop"
          if (
            event.type === "step_finish" &&
            event.part?.reason === "stop"
          ) {
            monitored.sawFinalStop = true;
          }
        } catch {
          // Not valid JSON — log it raw for debugging
          if (trimmed.length > 0 && trimmed.length < 500) {
            this.pushActivity(featureId, `[raw] ${trimmed.slice(0, 120)}`);
          }
        }
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      monitored.stderr += chunk;
      this.writeLog(featureId, `[stderr] ${chunk}`);
      // Show stderr in activity log too
      const lines = chunk.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        this.pushActivity(featureId, `[stderr] ${line.trim().slice(0, 120)}`);
      }
    });

    child.on("exit", (code) => {
      monitored.done = true;
      this.pushActivity(featureId, `-- process exited (code ${code})`);
      this.writeLog(featureId, `\n[wave-runner] Process exited with code ${code} at ${new Date().toISOString()}\n`);

      if (code === 0 || monitored.sawFinalStop) {
        this.callbacks.onComplete?.(featureId);
      } else {
        const error =
          monitored.stderr.slice(-2000) ||
          `Process exited with code ${code}`;
        this.callbacks.onError?.(featureId, error);
      }
    });

    child.on("error", (err) => {
      monitored.done = true;
      this.pushActivity(featureId, `!! process error: ${err.message}`);
      this.writeLog(featureId, `\n[wave-runner] Process error: ${err.message}\n`);
      this.callbacks.onError?.(featureId, err.message);
    });

    this.processes.set(featureId, monitored);
  }

  getSessionId(featureId: string): string | null {
    return this.processes.get(featureId)?.sessionId ?? null;
  }

  getOutput(featureId: string): string {
    return this.processes.get(featureId)?.stdout ?? "";
  }

  isRunning(featureId: string): boolean {
    const m = this.processes.get(featureId);
    if (!m) return false;
    if (m.done) return false;
    return isProcessRunning(m.process.pid!);
  }

  allDone(): boolean {
    const procs = Array.from(this.processes.values());
    for (const m of procs) {
      if (!m.done) return false;
    }
    return true;
  }

  activeCount(): number {
    let count = 0;
    const procs = Array.from(this.processes.values());
    for (const m of procs) {
      if (!m.done) count++;
    }
    return count;
  }

  remove(featureId: string): void {
    const m = this.processes.get(featureId);
    if (m && !m.done) {
      try {
        m.process.kill("SIGTERM");
      } catch {}
    }
    this.processes.delete(featureId);
  }

  killAll(): void {
    const ids = Array.from(this.processes.keys());
    for (const id of ids) {
      this.remove(id);
    }
  }

  waitAll(pollIntervalMs: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.allDone()) {
          resolve();
        } else {
          setTimeout(check, pollIntervalMs);
        }
      };
      check();
    });
  }
}
