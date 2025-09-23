# Code Quality & Optimization ToDo

## CRITICAL PRIORITY (Security & Performance Issues)

### Security Concerns
- **Remove debug console.log statements from production API calls** (`lib/api/home.ts:42,46,49,67,71,74,101,117,118,122,125` and `lib/api/core.ts:46,89,93,109,125,126`)
  - These leak sensitive API endpoints, data structures, and internal application state
  - Multiple API debug logs expose backend structure and data flow
  - `console.log('[createContentCollection] Input data:', createData)` exposes user input data

### Performance Issues
- **Excessive client-side JavaScript in App Router pages** (`app/[cardType]/[slug]/page.tsx:1`)
  - Main dynamic route is unnecessarily client-side with `'use client'`
  - Should be Server Component for better SEO and performance
  - Data fetching with `useEffect` instead of RSC patterns
  - Loading state handled client-side instead of Suspense boundaries

- **Inefficient re-renders in ContentBlockComponent** (`app/components/ContentBlockComponent.tsx:55-70`)
  - Complex `useEffect` dependencies causing unnecessary recalculations
  - Block normalization not properly memoized
  - Layout calculations happening on every component width change

## HIGH PRIORITY (Code Quality & Maintainability)

### Unused/Dead Code Removal
- **Commented out ImageFullScreen import and usage** (`app/[cardType]/[slug]/page.tsx:6,89,138`)
  - Dead import and commented code throughout the file
  - `onImageClick` parameter unused in ContentBlocksClient
  - Clean up or implement properly

- **Duplicate/redundant styling classes** (`styles/Home.module.scss:328-342`)
  - `.imageRight` defined twice (lines 328-331 and 339-342)
  - Multiple extend patterns that could be consolidated

- **Empty CSS selectors** (`styles/Home.module.scss:46-48,344-351`)
  - `.selected {}` class is empty
  - `.imageEdit` has hover styles but questionable utility

### Type Safety Issues
- **Loose type assertions** (`app/components/ContentBlock/utils.ts:26`, `ImageBlockRenderer.tsx:13-14`)
  - `getOriginalBlock(block: any): any` accepts and returns `any`
  - Type safety bypassed with unsafe casts
  - Should use proper TypeScript interfaces

- **Missing prop validation** (`app/[cardType]/[slug]/ContentBlocksClient.tsx:16-19`)
  - `onImageClick` prop defined but never used
  - ImageData interface defined locally but could be imported from types

### Architecture & Organization
- **Mobile-first CSS inconsistencies** (`styles/ContentBlockComponent.module.scss:54-64`)
  - Mobile overrides using `!important` instead of proper mobile-first approach
  - Desktop styles should be in `@media (min-width: 768px)` blocks

- **Mixed import patterns** (`app/components/ContentBlockComponent.tsx:1-13`)
  - Inconsistent import ordering and grouping
  - Should follow established patterns in CLAUDE.md

## MEDIUM PRIORITY (Optimization & Enhancement)

### CSS/Styling Improvements
- **Consolidate global CSS variables** (`styles/globals.css:13-58`)
  - Good foundation but could expand usage across components
  - Some components still use hardcoded values instead of CSS variables
  - Color variables well-defined but not fully utilized

- **Optimize font loading** (`styles/ContentBlockComponent.module.scss:164`)
  - Custom font 'Big Caslon' not preloaded
  - Could impact CLS (Cumulative Layout Shift)

- **Mobile spacing inconsistencies** (`styles/Home.module.scss:376-382`)
  - Mobile image borders use hardcoded `12px` instead of CSS variables
  - Should use `--space-*` variables for consistency

### Component Structure
- **Overly complex ContentBlockComponent props** (`app/components/ContentBlockComponent.tsx:15-25`)
  - Many optional props with defaults that could be simplified
  - Consider using a configuration object pattern

- **Redundant wrapper components** (`app/[cardType]/[slug]/ContentBlocksClient.tsx`)
  - Single-purpose wrapper that mostly passes props through
  - Width calculation logic could be moved to a hook
  - Consider combining with ContentBlockComponent

### State Management
- **Window resize listeners not optimized** (`app/[cardType]/[slug]/ContentBlocksClient.tsx:25-44`)
  - No debouncing on resize events
  - Could cause performance issues on frequent resizing
  - Multiple components likely duplicating this logic

## LOW PRIORITY (Nice-to-Have Improvements)

### Developer Experience
- **Extensive TODO comments cleanup** (Found 50+ TODO/FIXME comments across codebase)
  - Many outdated TODOs from previous development phases
  - Some mark deprecated features that should be removed
  - Dark mode TODOs in `styles/globals.css:141-143` should be prioritized or removed

### Code Style & Consistency
- **Inconsistent component export patterns**
  - Mix of default exports and named exports
  - Should standardize based on component type (pages vs components)

- **Magic numbers in styling** (`styles/ContentBlockComponent.module.scss:93,165,175`)
  - Badge padding `47px` is calculated but not explained
  - Font sizes `65px`, `75px` should use CSS variables
  - Hardcoded values throughout should be systematized

### Documentation & Comments
- **Missing JSDoc comments** (Most utility functions lack documentation)
  - Functions in `app/components/ContentBlock/utils.ts` need better documentation
  - Complex calculations in `utils/imageUtils.ts` need explanation

### Testing Coverage
- **Insufficient test coverage for new App Router components**
  - New ContentBlock components lack comprehensive tests
  - Image processing utilities need edge case testing
  - Mobile/responsive behavior needs testing

## REFACTOR OPPORTUNITIES

### Server Component Migration
1. **Convert `app/[cardType]/[slug]/page.tsx` to Server Component**
   - Move data fetching to Server Component pattern
   - Use proper error boundaries and loading.tsx
   - Implement proper caching with `revalidate` tags

2. **Optimize client boundaries**
   - Only interactive components should be client-side
   - Image clicking functionality should be isolated to specific components
   - Resize logic should be in a shared hook

### CSS Architecture
1. **Implement consistent design tokens**
   - Expand CSS variables in `globals.css`
   - Create semantic color naming (primary, secondary, etc.)
   - Standardize spacing, typography scales

2. **Mobile-first refactor**
   - Rewrite styles to be mobile-first throughout
   - Remove `!important` overrides
   - Use progressive enhancement patterns

### Component Architecture
1. **Extract shared logic**
   - Window resize/viewport detection hook
   - Image dimension calculation utilities
   - Responsive behavior patterns

2. **Simplify prop drilling**
   - Consider React Context for theme/layout settings
   - Reduce deeply nested prop passing
   - Use composition patterns over inheritance

## IMMEDIATE ACTION ITEMS

1. **SECURITY**: Remove all debug console.log statements from production code
2. **PERFORMANCE**: Convert main slug page to Server Component
3. **CLEANUP**: Remove commented ImageFullScreen code and unused imports
4. **STANDARDS**: Fix duplicate CSS classes and empty selectors
5. **TYPES**: Replace `any` types with proper TypeScript interfaces