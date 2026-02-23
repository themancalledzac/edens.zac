# Claude Code Subagents

Subagents are specialized, single-purpose agents that the parent session (Opus) can spawn via the `Task` tool to handle delegable work. Each agent gets its own context window with only its system prompt and the task description — it does the work, returns a result, and terminates. The parent never loses context to the subagent's work.

## How it works

1. Parent (Opus) hits a task and decides a piece is delegable
2. Spawns a subagent (Sonnet or Haiku) via the `Task` tool
3. The subagent gets its own isolated context with only its system prompt + the specific task
4. It completes the work, returns a result, and dies
5. The parent continues with full context intact

The parent sees each agent's `description` field in the frontmatter and routes tasks automatically when they match. You can also nudge explicitly: *"Use the test-writer agent for this"*.

## Agent inventory

| Agent | Model | Cost | Category | Purpose | Extra config |
|-------|-------|------|----------|---------|--------------|
| **implementer** | sonnet | $$ | Execute | Execute well-defined code changes | `permissionMode: acceptEdits` |
| **refactor-rename** | sonnet | $$ | Execute | Cross-file renames & restructuring | `permissionMode: acceptEdits` |
| **scaffolder** | haiku | $ | Execute | Create new files from patterns | `maxTurns: 10` |
| **debugger** | sonnet | $$ | Execute | Diagnose and fix bugs | `permissionMode: acceptEdits` |
| **test-writer** | sonnet | $$ | Support | Write tests for new/changed code | |
| **code-reviewer** | sonnet | $$ | Support | Review diffs for quality/bugs | `memory: project`, `background: true` |
| **scss-reviewer** | haiku | $ | Support | Review SCSS for consistency/responsive | `maxTurns: 15` |
| **explorer** | sonnet | $$ | Support | Read-only codebase research | `memory: project` |
| **linter-fixer** | haiku | $ | Support | Fix lint/formatting/type errors | `permissionMode: acceptEdits`, `maxTurns: 15` |
| **doc-writer** | haiku | $ | Support | Generate/update JSDoc & docs | `maxTurns: 10` |

## Tool restrictions (principle of least privilege)

Each agent only gets the tools it needs:

| Agent | Read | Write | Edit | Glob | Grep | Bash commands |
|-------|------|-------|------|------|------|---------------|
| **implementer** | Yes | Yes | Yes | Yes | Yes | `npm run type-check`, `npx jest` |
| **refactor-rename** | Yes | - | Yes | Yes | Yes | `npm run type-check`, `npx jest` |
| **scaffolder** | Yes | Yes | - | Yes | Yes | - |
| **debugger** | Yes | - | Yes | Yes | Yes | `npm run type-check`, `npx jest`, `npm run lint`, `git diff/log` |
| **test-writer** | Yes | Yes | Yes | Yes | Yes | `npm test`, `npx jest` |
| **code-reviewer** | Yes | - | - | Yes | Yes | `git diff/log/show`, `npm run lint`, `npm run type-check` |
| **scss-reviewer** | Yes | - | - | Yes | Yes | - |
| **explorer** | Yes | - | - | Yes | Yes | `git log/show`, `wc`, `ls` |
| **linter-fixer** | Yes | - | Yes | Yes | Yes | `npm run lint`, `npm run type-check`, `npx eslint` |
| **doc-writer** | Yes | - | Yes | Yes | Yes | - |

Key design decisions:
- **Execute agents** can modify code but are scoped to their task — implementer for edits, scaffolder for new files, refactor-rename for cross-file renames, debugger for surgical fixes
- **code-reviewer**, **scss-reviewer**, and **explorer** are fully read-only — they cannot modify files
- **doc-writer** and **scaffolder** have no Bash access — they can't run commands
- **linter-fixer** can edit but only has lint/type-check commands
- **refactor-rename** can edit but not write new files (prevents scope creep)
- **test-writer** can write files but should only touch `tests/` (enforced by prompt, not tooling)

## Frontmatter fields

| Field | Purpose |
|-------|---------|
| `name` | Agent identifier |
| `description` | **Routing mechanism** — the parent reads this to decide when to delegate. Vague descriptions = bad routing. |
| `model` | `sonnet` for reasoning-heavy tasks, `haiku` for mechanical tasks, `opus` for complex analysis |
| `tools` | Whitelist of available tools. Bash commands use glob syntax: `Bash(npm test:*)` |
| `permissionMode` | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` — controls permission prompts |
| `maxTurns` | Cap how many rounds the agent gets before stopping — prevents cost runaway |
| `memory` | `user`, `project`, or `local` — persistent cross-session knowledge in `.claude/agent-memory/` |
| `background` | `true` to always run as a background task — doesn't block the parent |
| `isolation` | `worktree` to run in a git worktree — safe parallel file edits |
| `hooks` | `PreToolUse`/`PostToolUse` lifecycle hooks for validation |
| `skills` | Preload skill content into the agent's context at startup |
| `disallowedTools` | Deny specific tools (inverse of `tools` allowlist) |

## Usage examples

```
"In contentLayout.ts, change buildRows() to accept an options object instead of positional args"
→ Parent spawns implementer (clear spec, 1-2 files)

"Rename ContentRenderer type to ContentDisplayConfig across the codebase"
→ Parent spawns refactor-rename (cross-file rename)

"Create a new ImageGallery component with SCSS module"
→ Parent spawns scaffolder (boilerplate generation)

"The layout is putting vertical images in the wrong row — investigate"
→ Parent spawns debugger (root cause unknown, needs diagnosis)

"Write tests for app/utils/contentLayout.ts"
→ Parent spawns test-writer

"Review the changes in the last 3 commits"
→ Parent spawns code-reviewer (runs in background)

"Check if the SCSS in Content/ follows responsive patterns consistently"
→ Parent spawns scss-reviewer

"How does the collection data flow from API to component?"
→ Parent spawns explorer

"Fix the lint errors in app/components/Content/"
→ Parent spawns linter-fixer

"Add JSDoc to all functions in app/lib/api/collections.ts"
→ Parent spawns doc-writer
```

## When to use execute agents vs. staying in the parent

| Use subagents when... | Stay in parent when... |
|---|---|
| 3+ independent file changes that can parallelize | Changes are deeply interdependent |
| Task is fully specified (Opus has done the thinking) | You're still discovering the shape of the problem |
| You want parallel execution of independent tasks | Each step's result informs the next decision |
| Context preservation matters for the parent | The task requires ongoing judgment calls |

The execute agents are "hands, not brains" — Opus plans, they execute. The **debugger** is the exception — it needs to think, but it returns a diagnosis + fix rather than ongoing dialogue.

## Things to know

1. **Subagents don't inherit parent context.** They get their system prompt and the task description. That's it. The parent needs to pass enough context in the task.
2. **One level deep only.** Subagents cannot spawn sub-subagents.
3. **The `description` field is the routing mechanism.** A vague description means the parent won't know when to use it. Be precise about the trigger condition.
4. **Tool restriction is where the real value is.** A doc-writer with only Read + Edit can't accidentally run your build or delete files.
5. **Model choice is where you save money.** Haiku for mechanical tasks (lint fixes, doc generation, SCSS review), Sonnet for tasks requiring code reasoning.
6. **`memory: project` agents build knowledge over time.** The code-reviewer and explorer accumulate project patterns in `.claude/agent-memory/`. Ask them to "check your memory" for accumulated insights.
7. **`background: true` agents don't block.** The code-reviewer runs in the background — you keep working while it reviews.
8. **`permissionMode: acceptEdits` skips edit prompts.** Agents that are supposed to edit files don't need to ask permission for every edit.

## Project conventions baked into agents

All agents are pre-configured with this project's patterns:

- **Test framework**: Jest + React Testing Library, tests in `tests/` mirroring `app/` structure
- **Import order**: React/Next.js > API/lib > Types > Components > Utils > Constants > Styles > Relative
- **Naming**: PascalCase components, camelCase utils, `use` prefix hooks
- **Type safety**: No `any`, `import type` for type-only imports, explicit return types
- **Architecture**: App Router only, Server Components by default, no legacy imports
- **Mocking**: `global.fetch`, `next/navigation`, `window.matchMedia` patterns
- **SCSS**: Mobile-first, `@media (width >= 768px)` for desktop, container queries, CSS custom properties, camelCase class names

## Adding new agents

Create a new `.md` file in this directory following the format above. Consider:

- What **model** does it need? Use haiku for mechanical tasks to save cost.
- What **tools** does it need? Start minimal — you can always add more.
- Is the **description** specific enough for the parent to route correctly?
- Does the system prompt include enough project context for the agent to work autonomously?
- Does it need **`permissionMode`**? Edit-focused agents should use `acceptEdits`.
- Should it have **`memory`**? Agents that accumulate knowledge benefit from `project` scope.
- Does it need a **`maxTurns`** cap? Haiku agents especially — prevents cost runaway.
