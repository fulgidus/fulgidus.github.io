/**
 * features.ts — Parse .features.yml and provide feature selection/filtering.
 *
 * Responsibilities:
 *   - Load and parse .features.yml with full type safety
 *   - Parse ISO 8601 durations into comparable minutes
 *   - Filter features by status, priority, difficulty, dependency readiness
 *   - Select features by various strategies (top-priority, quickest-wins, etc.)
 *   - Resolve dependency graphs to determine which features are ready to start
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeatureStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done"
  | "cancelled";

export type Priority = "critical" | "high" | "medium" | "low" | "wishlist";

export type Difficulty = "trivial" | "easy" | "medium" | "hard" | "very_hard";

export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  completion: number;
  difficulty: Difficulty;
  priority: Priority;
  depends_on: string[];
  effort: string;
  started_at: string | null;
  ended_at: string | null;
  constraints: string[];
  forbidden: string[];
  references: string[];
  notes: string[];
  subtasks: Subtask[];
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  completion: number;
  difficulty: Difficulty;
  priority: Priority;
  depends_on: string[];
  effort: string;
  started_at: string | null;
  ended_at: string | null;
  constraints: string[];
  forbidden: string[];
  references: string[];
  notes: string[];
  subtasks: Subtask[];
}

export interface FeaturesFile {
  version: string;
  meta: {
    created_at: string;
    updated_at: string;
    project: string;
    generator: string;
    maintainer: string;
  };
  features: Feature[];
  archive: Feature[];
}

// Priority ordering (lower = more important)
const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  wishlist: 4,
};

// Difficulty ordering (lower = easier)
const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  trivial: 0,
  easy: 1,
  medium: 2,
  hard: 3,
  very_hard: 4,
};

// ---------------------------------------------------------------------------
// ISO 8601 Duration Parser
// ---------------------------------------------------------------------------

/**
 * Parse an ISO 8601 duration string into total minutes.
 * Supports: P[nD][T[nH][nM][nS]]
 * Examples: PT1H → 60, PT30M → 30, P1D → 1440, P2DT4H → 3360, PT1H30M → 90
 */
export function parseDurationMinutes(iso: string): number {
  const match = iso.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );
  if (!match) return Infinity; // unparseable → sort to end
  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);
  const seconds = parseInt(match[4] || "0", 10);
  return days * 24 * 60 + hours * 60 + minutes + Math.ceil(seconds / 60);
}

/**
 * Format minutes into a human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes === Infinity) return "unknown";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    if (rh === 0 && m === 0) return `${d}d`;
    if (m === 0) return `${d}d ${rh}h`;
    return `${d}d ${rh}h ${m}m`;
  }
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Load and parse .features.yml from the project root.
 */
export function loadFeatures(projectRoot: string): FeaturesFile {
  const filePath = resolve(projectRoot, ".features.yml");
  const raw = readFileSync(filePath, "utf-8");
  const parsed = parseYaml(raw) as FeaturesFile;

  // Normalize: ensure arrays are never null/undefined
  for (const f of [...(parsed.features || []), ...(parsed.archive || [])]) {
    normalizeFeature(f);
  }

  return parsed;
}

function normalizeFeature(f: Feature | Subtask): void {
  f.depends_on = f.depends_on ?? [];
  f.constraints = f.constraints ?? [];
  f.forbidden = f.forbidden ?? [];
  f.references = f.references ?? [];
  f.notes = f.notes ?? [];
  f.subtasks = f.subtasks ?? [];
  for (const s of f.subtasks) {
    normalizeFeature(s);
  }
}

// ---------------------------------------------------------------------------
// Dependency Resolution
// ---------------------------------------------------------------------------

/**
 * Get all feature IDs that are done (status === "done" or completion === 100).
 */
function getDoneIds(features: Feature[], archive: Feature[]): Set<string> {
  const done = new Set<string>();
  const collectDone = (items: (Feature | Subtask)[]) => {
    for (const item of items) {
      if (item.status === "done" || item.completion === 100) {
        done.add(item.id);
      }
      if (item.subtasks?.length) {
        collectDone(item.subtasks);
      }
    }
  };
  collectDone(features);
  collectDone(archive);
  return done;
}

/**
 * Check if a feature's dependencies are all satisfied.
 */
export function areDependenciesMet(
  feature: Feature,
  doneIds: Set<string>
): boolean {
  return feature.depends_on.every((dep) => doneIds.has(dep));
}

/**
 * Get all features that are ready to start (backlog + deps met).
 */
export function getReadyFeatures(data: FeaturesFile): Feature[] {
  const doneIds = getDoneIds(data.features, data.archive);
  return data.features.filter(
    (f) =>
      f.status === "backlog" &&
      f.completion === 0 &&
      areDependenciesMet(f, doneIds)
  );
}

// ---------------------------------------------------------------------------
// Selection Strategies
// ---------------------------------------------------------------------------

export interface SelectionOptions {
  /** Select top N by priority (highest priority first, then lowest effort) */
  topPriority?: number;
  /** Select N quickest wins (lowest effort first) */
  quickestWins?: number;
  /** Select all features matching this priority level */
  priority?: Priority;
  /** Select all features matching this difficulty level */
  difficulty?: Difficulty;
  /** Select specific feature IDs (comma-separated) */
  featureIds?: string[];
  /** Select all ready features */
  allReady?: boolean;
}

/**
 * Select features based on the given strategy.
 * Always filters to only ready features (backlog + deps met) first.
 */
export function selectFeatures(
  data: FeaturesFile,
  options: SelectionOptions
): Feature[] {
  const ready = getReadyFeatures(data);

  if (options.allReady) {
    return sortByPriorityThenEffort(ready);
  }

  if (options.featureIds?.length) {
    const idSet = new Set(options.featureIds);
    const selected = ready.filter((f) => idSet.has(f.id));
    const missing = options.featureIds.filter(
      (id) => !selected.find((f) => f.id === id)
    );
    if (missing.length) {
      const allIds = data.features.map((f) => f.id);
      for (const m of missing) {
        if (!allIds.includes(m)) {
          console.error(`  Feature "${m}" does not exist in .features.yml`);
        } else {
          const feat = data.features.find((f) => f.id === m)!;
          console.error(
            `  Feature "${m}" is not ready (status: ${feat.status}, deps met: ${areDependenciesMet(feat, getDoneIds(data.features, data.archive))})`
          );
        }
      }
    }
    return sortByPriorityThenEffort(selected);
  }

  if (options.priority) {
    return sortByPriorityThenEffort(
      ready.filter((f) => f.priority === options.priority)
    );
  }

  if (options.difficulty) {
    return sortByEffort(ready.filter((f) => f.difficulty === options.difficulty));
  }

  if (options.topPriority) {
    return sortByPriorityThenEffort(ready).slice(0, options.topPriority);
  }

  if (options.quickestWins) {
    return sortByEffort(ready).slice(0, options.quickestWins);
  }

  // Default: return all ready, sorted by priority
  return sortByPriorityThenEffort(ready);
}

// ---------------------------------------------------------------------------
// Sorting Helpers
// ---------------------------------------------------------------------------

function sortByPriorityThenEffort(features: Feature[]): Feature[] {
  return [...features].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return parseDurationMinutes(a.effort) - parseDurationMinutes(b.effort);
  });
}

function sortByEffort(features: Feature[]): Feature[] {
  return [...features].sort(
    (a, b) => parseDurationMinutes(a.effort) - parseDurationMinutes(b.effort)
  );
}

// ---------------------------------------------------------------------------
// Utility Exports
// ---------------------------------------------------------------------------

export { PRIORITY_ORDER, DIFFICULTY_ORDER };

/**
 * Get a compact summary of a feature for display.
 */
export function featureSummary(f: Feature): string {
  const effort = formatDuration(parseDurationMinutes(f.effort));
  return `[${f.priority}/${f.difficulty}] ${f.id} — ${f.title} (${effort})`;
}

/**
 * Find a feature by ID across both active and archive lists.
 */
export function findFeatureById(
  data: FeaturesFile,
  id: string
): Feature | undefined {
  return (
    data.features.find((f) => f.id === id) ??
    data.archive?.find((f) => f.id === id)
  );
}
