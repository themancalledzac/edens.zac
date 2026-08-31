---
description: Frontend Portfolio Repository Rules for AI Agents
globs:
alwaysApply: true
---

# Project Rules

## Critical Rules

- **Context First**: Always ask for more context when it will help make a better decision. Do this before writing code.
- **Work In The Primary Checkout**: Unless the user says another agent session is running, make all changes in `/Users/themancalledzac/Code/edens.zac` on the branch that is currently checked out. No git worktrees, no side branches, no isolated copies — the user's `npm run dev` serves that directory, and anything outside it is invisible to them.
- **Use Port 3000 — Attach, Never Bind**: Look at the same page the user is looking at. `preview_start` with `{name: "Zac's Dev Server"}` (the first entry in `.claude/launch.json`) ATTACHES to the user's already-running server on 3000 — it declares a `url` and no command, so it starts nothing. Agent and user then share one server, one build, one view. Never run `next dev` on 3000 yourself: a second bind lands on the other IP stack, silently shadows the user's server for days, and re-creates the exact split-brain this rule exists to end. Only if 3000 is genuinely down, fall back to the 3001 config and stop it at end of session.
- **Localhost Admin Needs No Login**: `/admin` and every `(admin)` route is reachable anonymously in local/dev, by design and at every layer — `proxy.ts` passes the route group through, the BFF's anonymous-admin reject is `NODE_ENV === 'production'`-only, `requireAdmin()` returns early on `isLocalEnvironment()`, and the local backend serves `/api/admin/**` with no cookie. Do not "fix" any of those as a security hole and do not ask the user to log in for you; production is gated by `meServer()` + the backend's `hasRole('ADMIN')` and is covered by tests in `tests/utils/admin.test.ts`.
- **App Router First**: All new features must use Next.js App Router (`app/` directory). Never modify legacy Pages Router files.
- **Server Components Default**: Minimize `'use client'` usage. Prefer Server Components for data fetching and rendering.
- **Type Safety**: No `any` types. Use strict TypeScript with proper type definitions from `app/types/`.
- **Testing Required**: All new API functions and utility functions must have corresponding tests in `tests/`.

## Running Tests

```bash
npm test
```

Common flags:

- All tests: `npm test`
- Single file: `npm test tests/utils/contentLayout.test.ts`
- Watch mode: `npm run test:watch`

## Formatting & Verification

After editing, run `npx eslint --fix`, then `npx prettier --write`, then `npx tsc --noEmit` — each
scoped to the files you changed. That order is required, and `tsc` must run _after_ `eslint --fix`,
never only before. For SCSS also run `npx stylelint --fix`. Rationale and the autofix/type-check
gotcha: `ai_guidelines/ai_lint.md`.

## Common Mistakes to Avoid

New components need a matching SCSS module. Use `next/image` with CloudFront URLs. Prefer URL state
over React Context. Import named exports from `'react'`, never the `React` namespace. Full list:
`ai_guidelines/ai_quick_reference.md`.

## Comments & Documentation

Never write inline comments — not in function bodies, JSX, or tests. Docblocks are the only place
prose belongs, and they stay short: three sentences, about what a reader needs in order to use or
change the code. Investigation narrative, measurements and rejected alternatives go in the PR and
the `docs/spikes/` group file, not the docblock. Full rules: `ai_guidelines/ai_docs.md`.

## Modular Guidelines

For detailed guidance on specific topics, refer to the files in `ai_guidelines/`:

| Topic                                       | Reference File                        |
| ------------------------------------------- | ------------------------------------- |
| **Core principles & project context**       | `ai_guidelines/ai_main.md`            |
| **File naming, imports, project structure** | `ai_guidelines/ai_quick_reference.md` |
| **Testing strategy & patterns**             | `ai_guidelines/ai_test.md`            |
| **ESLint & Stylelint config**               | `ai_guidelines/ai_lint.md`            |
| **API patterns & backend integration**      | `ai_guidelines/ai_api.md`             |
| **TypeScript guidelines & known issues**    | `ai_guidelines/ai_typescript.md`      |
| **CSS/SCSS conventions (gap rule)**         | `ai_guidelines/ai_css.md`             |
| **Docblocks, comments, doc hygiene**        | `ai_guidelines/ai_docs.md`            |

**Note**: These files are modular and should be referenced when working in the relevant area.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
