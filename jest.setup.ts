/**
 * Title: Jest Test Environment Setup
 *
 * What this file is:
 * - Centralized setup for Jest tests; configures React Testing Library matchers.
 *
 * Replaces in the old code:
 * - Replaces ad-hoc per-test imports of jest-dom; standardizes test environment initialization.
 *
 * New Next.js features used:
 * - None directly; supports Phase 5.1 testing alongside App Router.
 *
 * TODOs / Improvements:
 * - Add additional polyfills/mocks only when needed (e.g., next/router mocks, fetch polyfill in Node).
 */
import '@testing-library/jest-dom';

// jsdom doesn't expose TextEncoder/TextDecoder, but next/cache and other
// Next.js internals reference them at module load. Polyfill from Node's util.
import { TextDecoder, TextEncoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
