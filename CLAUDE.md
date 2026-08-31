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
- **Production Is AWS Amplify Hosting, Auto-Deployed From `main`**: Merging to `main` builds and deploys to production on Amplify's own build hook, measured at ~15 minutes. CI does not gate it — a red merge reaches production. The build and routing config lives in the Amplify console, not the repo (no `amplify.yml`, no deploy job in `.github/`), so anything depending on it has to be checked against production rather than a local `next build`. Amplify fronts the site with its own CloudFront distribution, which is not `d2qp8h5pbkohe6.cloudfront.net` — that one is the S3 image CDN pinned in `next.config.js`. Amplify injects no headers of its own, so every security header in a production response comes from `next.config.js`.
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

After editing files, run ESLint fix, then Prettier, then type check. **Order matters**: `eslint --fix`
rewrites import blocks, so Prettier must run last or it will re-wrap them and leave the tree
unformatted. **Scope the commands to the files you actually changed** — running them across the whole
tree rewrites unrelated files and pollutes the diff.

```bash
# Lint fix first (matches Cursor's source.fixAll.eslint on save)
npx eslint --fix <files>
# Format last (matches .prettierrc.json)
npx prettier --write <files>
# Type check LAST of all — an ESLint autofix can break types (see below)
npx tsc --noEmit
```

Always re-run `tsc` **after** `eslint --fix`, never only before. `unicorn/no-useless-undefined`
strips the argument from `jest.fn().mockResolvedValue(undefined)`, and the resulting
`mockResolvedValue()` fails to type-check for a `Promise<void>` mock. Write those as
`jest.fn(() => Promise.resolve())`, which satisfies both tools.

For SCSS files, also run Stylelint:

```bash
npx stylelint --fix <files>
```

## Common Mistakes to Avoid

- Writing comments inside React component code (JSX `{/* ... */}` or inline `//` in component or function bodies) - documentation belongs in docblocks (JSDoc above the file/component/function) only. "Why" context is not an exception: it goes in the docblock of the function it explains. If a function's docblock would get too big because the function does too much, split the function instead of commenting inline
- Using `'use client'` unnecessarily - prefer Server Components
- Using `any` type - always use proper TypeScript types
- Creating components without corresponding SCSS modules
- Using React Context when URL state would suffice
- Not using `next/image` for images (always use CloudFront URLs)
- Using `import React` namespace - always use named imports from `'react'`

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
