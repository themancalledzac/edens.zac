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
- **Localhost Admin Needs No Login — Frontend Only**: `/admin` and every `(admin)` route _renders_ anonymously in local/dev — `proxy.ts` passes the route group through, the BFF's anonymous-admin reject is `NODE_ENV === 'production'`-only, and `requireAdmin()` returns early on `isLocalEnvironment()`. Do not "fix" those three as a security hole; `tests/utils/admin.test.ts` covers them. **The backend is not open.** Since backend [#243](https://github.com/themancalledzac/edens.zac.backend/pull/243), `/api/admin/**` requires `hasRole('ADMIN')` in every profile, so the shell renders while its data 401s — expected, not a bug to chase or a frontend gate to loosen. Local admin data needs a real login: `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`, then `POST /api/auth/login`.
- **Production Is AWS Amplify Hosting, Auto-Deployed From `main`**: Merging to `main` builds and deploys to production on Amplify's own build hook, measured at ~15 minutes. Since 2026-08-31 `main` is protected: the `Type check, lint, test` check is required and `enforce_admins` is on, so only a green commit can get to `main` and the deploy that follows is green by construction. Amplify itself has no wait-for-checks setting — the gate is entirely GitHub's. Nobody, including the owner, can push straight to `main`. The build and routing config lives in the Amplify console, not the repo (no `amplify.yml`, no deploy job in `.github/`), so anything depending on it has to be checked against production rather than a local `next build`. Amplify fronts the site with its own CloudFront distribution, which is not `d2qp8h5pbkohe6.cloudfront.net` — that one is the S3 image CDN pinned in `next.config.js`. Amplify injects no headers of its own, so every security header in a production response comes from `next.config.js`.
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

**Note**: These files are modular and should be referenced when working in the relevant area.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
