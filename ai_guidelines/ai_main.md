# Core Principles & Critical Rules

## Critical Rules

- **Context First**: Always ask for more context when it will help make a better decision. Do this before writing code.
- **App Router Only**: The app is entirely App Router (`app/` directory). There is no `pages/` directory — the Pages Router migration is complete.
- **Server Components Default**: Minimize `'use client'` usage. Prefer Server Components for data fetching and rendering.
- **Type Safety**: No `any` types. Use strict TypeScript with proper type definitions from `app/types/`.
- **Testing Required**: All new API functions and utility functions must have corresponding tests in `tests/`.

## Core Principles

### 1. App Router Only

- **All features** live under `app/`; there is no legacy `pages/` directory
- **Favor Server Components**: Minimize `'use client'` usage
- **Use RSC patterns**: Async data fetching, streaming, Suspense boundaries
- **File organization**: Use route groups like `(admin)` for logical organization

### 2. Performance & Best Practices

- **SSR-first approach**: Keep components server-side when possible
- **Minimize context usage**: Prefer URL state and RSC props over React Context
- **Optimize images**: Use `next/image` with S3/CloudFront URLs, WebP/AVIF formats
- **Code splitting**: Dynamic imports for heavy client-side components
- **Mobile-first**: Responsive design with mobile-first approach

## Project Context

### Current Architecture

- **Frontend**: Next.js 16 with App Router, React 19, TypeScript 5.8
- **Backend**: Java Spring Boot with Hibernate/JPA and PostgreSQL (on EC2)
- **Storage**: S3 for media files with CloudFront CDN distribution
- **Backend access**: The browser always goes through the BFF proxy (`app/api/proxy/[...path]`); the server hits the backend directly on `localhost:8080` in dev
- **Content System**: Unified Content model — collections composed of `IMAGE`/`TEXT`/`GIF`/`COLLECTION`/`PANEL` blocks (see `app/types/Content.ts`)

### Development Environment

- **Default assumption**: Localhost development unless specified otherwise
- **Backend access**: localhost Spring Boot server on `:8080`
- **Port configuration**: Frontend `npm run dev` runs on `:3000` (Next.js default), backend on `:8080`

## Code Quality Rules

- **No trivial helper functions**: Don't extract single-expression logic (e.g., `!!value.slug`, `value > 0`) into named utility functions — inline it where used, since the intent is self-evident at the call site. A helper earns its place only when it encapsulates non-trivial logic, appears at 3+ call sites, or names a meaningful domain concept.

## TODOs

- **MenuDropdown 'About' image**: The about section image is currently hardcoded as `/_DSC0145.jpg` in `app/components/MenuDropdown/MenuDropdown.tsx:188`. This should eventually be fetched from the database instead of being a static asset in the frontend repo.

## Key Reminders

- **Speed and accuracy**: Prioritize both performance and correctness
- **Don't break existing functionality**: Preserve current behavior when refactoring
- **Test everything new**: No new code without corresponding tests
- **Use App Router patterns**: RSC, streaming, proper caching for new features
- **Assume localhost development**: Unless specifically told otherwise
- **S3/CloudFront knowledge**: Use existing infrastructure patterns
- **Spring Boot familiarity**: Leverage existing backend API patterns
