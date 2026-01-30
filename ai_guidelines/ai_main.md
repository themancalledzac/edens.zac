# Core Principles & Critical Rules

## Critical Rules

- **Context First**: Always ask for more context when it will help make a better decision. Do this before writing code.
- **App Router First**: All new features must use Next.js App Router (`app/` directory). Never modify legacy Pages Router files.
- **Server Components Default**: Minimize `'use client'` usage. Prefer Server Components for data fetching and rendering.
- **Type Safety**: No `any` types. Use strict TypeScript with proper type definitions from `app/types/`.
- **Legacy Preservation**: Never modify files in legacy directories. Build new features in parallel.
- **Testing Required**: All new API functions and utility functions must have corresponding tests in `tests/`.

## Core Principles

### 1. Legacy Preservation & Migration Strategy
- **CRITICAL**: Preserve all OLD functionality while migrating to App Router paradigm
- **Never modify legacy files** in `pages-old/`, `Components/`, or existing catalog system
- **Build in parallel**: Create new App Router features alongside existing Pages Router
- **Gradual deprecation**: Keep legacy files operational until full migration is complete
- **No breaking changes**: Maintain backwards compatibility during transition

### 2. App Router First
- **All new features** must use App Router structure (`app/` directory)
- **Favor Server Components**: Minimize `'use client'` usage
- **Use RSC patterns**: Async data fetching, streaming, Suspense boundaries
- **File organization**: Use route groups like `(admin)` for logical organization

### 3. Performance & Best Practices
- **SSR-first approach**: Keep components server-side when possible
- **Minimize context usage**: Prefer URL state and RSC props over React Context
- **Optimize images**: Use `next/image` with S3/CloudFront URLs, WebP/AVIF formats
- **Code splitting**: Dynamic imports for heavy client-side components
- **Mobile-first**: Responsive design with mobile-first approach

## Project Context

### Current Architecture
- **Frontend**: Next.js 15 with App Router (migrating from Pages Router)
- **Backend**: Java Spring Boot with Hibernate/JPA and MySQL RDS
- **Storage**: S3 for media files with CloudFront CDN distribution
- **Development**: Localhost development with access to both localhost backend and production RDS
- **Content System**: Transitioning from legacy Catalog/Image system to new ContentCollection system

### Development Environment
- **Default assumption**: Localhost development unless specified otherwise
- **Backend access**: Both localhost Spring Boot server and production RDS available
- **Port configuration**: Frontend typically runs on 3001, backend on 8080

## Key Reminders

- **Speed and accuracy**: Prioritize both performance and correctness
- **Don't break existing functionality**: Legacy system must remain operational
- **Test everything new**: No new code without corresponding tests
- **Use App Router patterns**: RSC, streaming, proper caching for new features
- **Assume localhost development**: Unless specifically told otherwise
- **S3/CloudFront knowledge**: Use existing infrastructure patterns
- **Spring Boot familiarity**: Leverage existing backend API patterns
