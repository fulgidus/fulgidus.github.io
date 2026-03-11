/**
 * prompt.ts — Generate agent prompts from feature specs.
 *
 * Responsibilities:
 *   - Transform a Feature into a structured prompt for the wave-worker agent
 *   - Include feature spec, subtasks, constraints, forbidden items, references
 *   - Include the list of relevant files the agent should explore
 *   - Generate the build command and success criteria
 */

import type { Feature, Subtask } from "./features.js";
import { formatDuration, parseDurationMinutes } from "./features.js";

// ---------------------------------------------------------------------------
// Prompt Generation
// ---------------------------------------------------------------------------

/**
 * Generate the full prompt for an autonomous agent working on a feature.
 */
export function generatePrompt(feature: Feature, baseBranch: string): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Feature Implementation: ${feature.title}`);
  sections.push(`**Feature ID:** \`${feature.id}\``);
  sections.push(`**Branch:** \`feature/${feature.id}\``);
  sections.push(`**Base:** \`${baseBranch}\``);
  sections.push(
    `**Estimated Effort:** ${formatDuration(parseDurationMinutes(feature.effort))}`
  );
  sections.push(
    `**Difficulty:** ${feature.difficulty} | **Priority:** ${feature.priority}`
  );

  // Description
  sections.push(`\n## Description\n`);
  sections.push(feature.description.trim());

  // Subtasks
  if (feature.subtasks.length > 0) {
    sections.push(`\n## Subtasks\n`);
    sections.push(
      "Complete these in order. Mark each done with a commit when finished.\n"
    );
    for (let i = 0; i < feature.subtasks.length; i++) {
      sections.push(formatSubtask(feature.subtasks[i], i + 1, 0));
    }
  }

  // Constraints
  if (feature.constraints.length > 0) {
    sections.push(`\n## Constraints\n`);
    sections.push(
      "You MUST follow these constraints. Violating any is a failure.\n"
    );
    for (const c of feature.constraints) {
      sections.push(`- ${c}`);
    }
  }

  // Forbidden
  if (feature.forbidden.length > 0) {
    sections.push(`\n## Forbidden\n`);
    sections.push(
      "You MUST NOT do any of the following. Violating any is a failure.\n"
    );
    for (const f of feature.forbidden) {
      sections.push(`- ${f}`);
    }
  }

  // References (files to explore)
  if (feature.references.length > 0) {
    sections.push(`\n## Key Files to Explore\n`);
    sections.push(
      "Start by reading these files to understand the current state:\n"
    );
    for (const r of feature.references) {
      sections.push(`- \`${r}\``);
    }
  }

  // Notes (context from feature planning)
  if (feature.notes.length > 0) {
    sections.push(`\n## Planning Notes\n`);
    for (const n of feature.notes) {
      sections.push(`- ${n}`);
    }
  }

  // Build verification
  sections.push(`\n## Build Verification\n`);
  sections.push(
    "After completing all changes, run the build to verify everything works:\n"
  );
  sections.push("```bash");
  sections.push("bun run build");
  sections.push("```\n");
  sections.push(
    "This runs: `astro check && astro build && pagefind --site dist`"
  );
  sections.push(
    "\nIf the build fails, fix the errors before considering the task complete."
  );

  // Commit guidelines
  sections.push(`\n## Commit Guidelines\n`);
  sections.push("- Use conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `docs(scope):`");
  sections.push(`- Scope should be: \`${feature.id}\` or a relevant module name`);
  sections.push("- Commit after each logical unit of work (roughly per subtask)");
  sections.push("- Do NOT squash all changes into one commit");
  sections.push("- Do NOT push to remote — the wave-runner handles that");
  sections.push("- Do NOT modify `.features.yml` — the wave-runner handles that");

  // Final instruction
  sections.push(`\n## Execution\n`);
  sections.push("1. Read the key files listed above to understand the codebase");
  sections.push("2. Create a plan (use the TodoWrite tool)");
  sections.push("3. Implement each subtask, committing as you go");
  sections.push("4. Run `bun run build` to verify");
  sections.push("5. If the build passes, you are done");
  sections.push("6. If the build fails, fix the errors and re-run until it passes");

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Subtask Formatting
// ---------------------------------------------------------------------------

function formatSubtask(
  subtask: Subtask,
  index: number,
  depth: number
): string {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  lines.push(
    `${indent}${index}. **${subtask.title}** (\`${subtask.id}\`, ${formatDuration(parseDurationMinutes(subtask.effort))})`
  );
  lines.push(`${indent}   ${subtask.description.trim()}`);

  if (subtask.constraints.length > 0) {
    for (const c of subtask.constraints) {
      lines.push(`${indent}   - Constraint: ${c}`);
    }
  }
  if (subtask.forbidden.length > 0) {
    for (const f of subtask.forbidden) {
      lines.push(`${indent}   - Forbidden: ${f}`);
    }
  }
  if (subtask.references.length > 0) {
    lines.push(
      `${indent}   - Files: ${subtask.references.map((r) => `\`${r}\``).join(", ")}`
    );
  }
  if (subtask.depends_on.length > 0) {
    lines.push(
      `${indent}   - Depends on: ${subtask.depends_on.map((d) => `\`${d}\``).join(", ")}`
    );
  }

  // Nested subtasks
  if (subtask.subtasks.length > 0) {
    for (let i = 0; i < subtask.subtasks.length; i++) {
      lines.push(formatSubtask(subtask.subtasks[i], i + 1, depth + 1));
    }
  }

  return lines.join("\n");
}
