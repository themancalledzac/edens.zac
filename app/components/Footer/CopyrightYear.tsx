'use client';

/**
 * The current year for the footer's copyright line, isolated into a Client
 * Component so no Server Component in the root layout reads `Date`
 * synchronously. Cache Components treats such a read as a prerender build
 * error that no segment opt-out clears, and Footer renders on every route.
 */
export function CopyrightYear() {
  return <>{new Date().getFullYear()}</>;
}

export default CopyrightYear;
