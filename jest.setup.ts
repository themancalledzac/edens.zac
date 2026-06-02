/**
 * Centralized Jest setup: registers React Testing Library matchers.
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
