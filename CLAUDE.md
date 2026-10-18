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
- **Localhost Admin: Anonymous Locally, Real Login When It Matters**: `/admin` and every `(admin)` route _renders_ anonymously in local/dev — `proxy.ts` passes the route group through, the BFF's anonymous-admin reject is `NODE_ENV === 'production'`-only, and `requireAdmin()` returns early on `isLocalEnvironment()`. Do not "fix" those three as a security hole; `tests/utils/admin.test.ts` covers them. Owner-tested 2026-10-18: an anonymous `GET localhost:8080/api/admin/users` returned 200 (the dev-profile `DevLocalAdminFilter` answers it as the bootstrap admin), and a bootstrap login with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` works. Backend PR [#334](https://github.com/themancalledzac/edens.zac.backend/pull/334) (merged 2026-10-18) limits that anonymous admin to loopback callers plus addresses in `DEV_LOCAL_ADMIN_EXTRA_ADDRESSES`; the local backend runs in Docker, so a Docker user sets that variable to the Docker gateway address or logs in. `/admin` renders the admin's own space with an Admin section; `/user` redirects admins there. Anonymously in local dev it renders the hub alone.
- **Production Is AWS Amplify Hosting, Auto-Deployed From `main`**: Merging to `main` builds and deploys to production on Amplify's own build hook, measured at ~15 minutes. Since 2026-08-31 `main` is protected: the `Type check, lint, test` check is required and `enforce_admins` is on, so only a green commit can get to `main` and the deploy that follows is green by construction. Amplify itself has no wait-for-checks setting — the gate is entirely GitHub's. Nobody, including the owner, can push straight to `main`. The build and routing config lives in the Amplify console, not the repo (no `amplify.yml`, no deploy job in `.github/`), so anything depending on it has to be checked against production rather than a local `next build`. Amplify fronts the site with its own CloudFront distribution, which is not `d2qp8h5pbkohe6.cloudfront.net` — that one is the S3 image CDN pinned in `next.config.js`. Amplify injects no headers of its own, so every security header in a production response comes from `next.config.js`.
- **App Router First**: All new features must use Next.js App Router (`app/` directory).
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

After editing, run ESLint fix, then Prettier, then the type check. **Order matters**: `eslint --fix`
rewrites import blocks, so Prettier must run after it or it leaves the tree unformatted, and `tsc`
must run last of all because an ESLint autofix can break types. **Scope the commands to the files you
changed** — running them across the whole tree rewrites unrelated files and pollutes the diff.

```bash
npx eslint --fix <files>
npx prettier --write <files>
npx tsc --noEmit
```

Always re-run `tsc` _after_ `eslint --fix`, never only before. `unicorn/no-useless-undefined` strips
the argument from `jest.fn().mockResolvedValue(undefined)`, and the resulting `mockResolvedValue()`
fails to type-check for a `Promise<void>` mock. Write those as `jest.fn(() => Promise.resolve())`,
which satisfies both tools.

For SCSS files, also run `npx stylelint --fix <files>`. Full-tree check before a commit (not while
editing): `npx eslint app/ --max-warnings 0`.

ESLint config is `eslint.config.mjs`. Fix proactively: unused imports, `any` types, formatting. Import
sorting is `simple-import-sort`, in the order under "Import Organization".

## Code Quality

- **No trivial helper functions**: Don't extract single-expression logic (e.g., `!!value.slug`, `value > 0`) into named utility functions — inline it where used, since the intent is self-evident at the call site. A helper earns its place only when it encapsulates non-trivial logic, appears at 3+ call sites, or names a meaningful domain concept.
- **No comments inside function or component bodies** (JSX `{/* ... */}` or inline `//`). Documentation belongs in docblocks (JSDoc above the file/component/function) only. "Why" context is not an exception: it goes in the docblock of the function it explains. If a docblock would get too big because the function does too much, split the function instead of commenting inline.

## File Naming

- **Components**: PascalCase (`About.tsx`, `ContentComponent.tsx`)
- **Utilities**: camelCase (`contentLayout.ts`, `rowStructureAlgorithm.ts`)
- **SCSS Modules**: component name + `.module.scss` (`About.module.scss`)
- **Hooks**: camelCase with `use` prefix (`useViewport.ts`, `useMetadataEditor.tsx`)
- **Types**: PascalCase (`Collection.ts`, `Content.ts`)
- **API Functions**: camelCase (`collections.ts`, `content.ts`)
- **Directories**: lowercase with dashes; route groups in parentheses (`(admin)`, `all-collections`)
- Content transformation goes through the utilities in `app/utils/contentLayout.ts`.

## Import Organization

Import order (strict):

1. React/Next.js imports
2. Internal API/lib imports (`@/app/lib/api/*`)
3. Type imports (`@/app/types/*`)
4. Component imports (`@/app/components/*`)
5. Utility imports (`@/app/utils/*`)
6. Constants (`@/app/constants`)
7. Styles (SCSS modules)
8. Relative imports (same directory)

Use the `type` keyword for type-only imports. Never `import React from 'react'` or
`import React, { ... } from 'react'`; always use named imports, e.g.
`import { type SubmitEvent, useState } from 'react'`.

## TypeScript

- **Never use `any`.** When a type is truly unknown, use `unknown` and narrow it with a type guard. Use type assertions sparingly.
- **React 19 event types**: `onSubmit` takes `SubmitEvent<HTMLFormElement>` (`FormEvent` is deprecated); `onChange` takes `ChangeEvent<HTMLInputElement>` or `ChangeEvent<HTMLTextAreaElement>`.
- **Enums, not string literals**: when a type uses an enum (e.g. `CollectionVisibility`), use the enum value (`CollectionVisibility.LISTED`), never the raw string (`'LISTED'`), which does not satisfy the enum type.

## Collection Kind Model

Collections are **typeless**: there is no `CollectionType` enum and no `type` field. A collection's kind is two mutually exclusive boolean discriminators on `CollectionModel`:

```typescript
interface CollectionModel {
  isClient: boolean; // private client delivery (password-gated)
  isBlog: boolean; // dated, chronological entry
}
```

Both false is the default and is just a collection. The backend rejects both being true. Read them with the fail-safe `=== true` form, since a stale cache entry can outlive the type.

Parent-ness is not a kind. It is server-derived over the whole content graph and arrives on the admin payload (`CollectionUpdateResponseDTO`) as `hasChildren?: boolean`, alongside the complete `childCollectionIds?: number[]`. Both are optional only so the page degrades gracefully against an older backend; prefer them over scanning the page-bounded `collection.content` for child refs.

## CSS & Styling

**Use `gap`, never padding, for spacing between flex items.** Never use `padding-right/bottom` on `:not(:last-child)`. Gaps sit _between_ boxes; padding sits _inside_ them and, with `box-sizing: border-box`, shrinks the content area after the layout math has already subtracted gaps from the available width and distributed the rest. The rows then come up short of the container width. Layout sizing in `app/utils/rowStructureAlgorithm.ts` assumes gaps are between boxes.

- `LAYOUT.gridGap = 12.8` (`app/constants/index.ts`); the CSS equivalent is `0.8rem` at a 16px base.
- Reference implementation: `app/components/Content/BoxRenderer.module.scss`.

## Inline JSX Config Rule

A literal `Array` or `Object` passed as a prop in JSX **must be lifted out of the render function** when **both** hold:

1. It spans **more than 5 lines** (Prettier-formatted), AND
2. **None** of its values reference a component-scope identifier (props, state, closure variables, hook return values, or values computed earlier in the function body).

**Lift to** (in order of preference):

- **Module-scope `const` above the function** — the default. Keeps the data co-located with its single consumer.
- **A typed const next to the relevant type/enum** in `app/types/` — when the data is a label/description for a domain enum (mirror `COLLECTION_VISIBILITY_LABELS` in `app/types/CollectionVisibility.ts`).
- **A sibling `<feature>.config.ts`** — only when the literal is consumed by **2+ files** OR exceeds **~80 LoC** of pure config.

If a literal is mostly static but contains one props-derived field (e.g. an `addNewFields` array where one field's `options` comes from a prop), extract a `buildXxx(deps)` helper at module scope that takes the dependencies and returns the array.

**Do NOT lift:**

- 1-line literals (button labels, single placeholders, trivial arrow functions like `getDisplayName={lens => lens.name}`).
- Literals whose surrounding markup conditionally renders them or whose handler shapes differ — forcing them into an array-of-configs driving a `.map()` makes the file harder to read.
- One-line closure-bound event handlers — `useCallback` adds ceremony without profiler evidence.

Greppable check: `addNewFields={[`, `options={[`, or 3+ consecutive `<option value=` lines inside a render function that reference only string/number literals likely violate the rule. Reference example: `app/components/Metadata/sections/CameraSettingsSection.tsx` lifts `LENS_ADD_NEW_FIELDS` / `FILM_STOCK_ADD_NEW_FIELDS` / `buildCameraAddNewFields(...)` to module scope.

## Common Mistakes to Avoid

- Using `'use client'` unnecessarily — prefer Server Components
- Importing from `pages/` or legacy directories
- Using `any`
- Creating a component without its SCSS module
- Mixing camelCase and PascalCase for similar file types
- Forgetting tests for new utility functions
- Using React Context when URL state would suffice
- Not using `next/image` for images (always use CloudFront URLs)
- Using the `import React` namespace — use named imports from `'react'`
- Using deprecated `FormEvent` — use `SubmitEvent<HTMLFormElement>`
- Writing comments inside component or function bodies — docblocks only
- Inline static config (>5 LoC array/object literal with no component-scope refs) in JSX — see "Inline JSX Config Rule"

## Test Mocks and Fixtures

Standard mocks:

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

global.fetch = jest.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

Fixtures must match the current type definitions exactly:

- `CollectionModel` carries the boolean kind discriminators `isClient` / `isBlog`; there is no `type` field and no `CollectionType` enum.
- `ContentCollectionModel` requires `referencedCollectionId: number`.
- `ContentImageModel.locations` is `LocationModel[]` (required), not a single `location` string or object.
- Component tests using `toBeInTheDocument()` need `import '@testing-library/jest-dom'` at the top.
- `createHeaderRow()` returns a union type — narrow with type guards before accessing `.items`.

## Testing gotchas

1. Jest and `tsc` cannot see CSS-module failures. `tests/styles/scssImportResolution.test.ts` and the repo-wide `styles.<key>` guard (#415) are the gates. Any SCSS change also runs `next build`.
2. `new Response(...)` in a jest mock throws under jsdom. Resolve a plain `{ ok: true }`.
3. Collapsing two exports into one merges their `jest.mock` automocks. Grep `jest.mock('<path>')` first.
4. A regression test must be watched failing without its fix.
5. A drift-guard test keyed on "every field" needs its fixture updated in the same change that adds a field.
6. A numeric API parameter that no test exercises against the real backend needs a live check or a pinned bound.
7. Grep the backend's `origin/main` (`git grep <p> origin/main -- src/`), never its checkout; `.claude/worktrees/` copies triple every hit.
8. Mount a component the admin API will not serve in a throwaway route under `app/` with fixture props; the folder name must not start with `_`.
9. `gh` fails inside the agent sandbox (keyring), and `git checkout -b` fails dirty there; run both with the sandbox disabled.
10. Three SCSS partial traps on `@use`. (a) A loud `/* */` comment in a partial is emitted into every stylesheet that `@use`s it, so partial comments must be silent `//`, with no bare `//` separator lines because stylelint's `scss/comment-no-empty` rejects them. (b) `@extend` hoists the extending selector to the placeholder's position; use a `@mixin` when byte-identical output is required. (c) Turbopack ignores `sassOptions.includePaths` and reads `loadPaths`.
11. An extraction costs docblocks plus a required new test suite; quote code delta, docblock delta and test delta separately.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
