"use client";

/**
 * App-wide Client Providers (App Router)
 *
 * What this file is:
 * - A minimal client-only wrapper that configures React Context providers for the App Router layout.
 *
 * Replaces in the old code:
 * - Replaces global context usage sprinkled across pages/components; centralizes client providers in one island.
 *
 * New Next.js features used:
 * - Isolated client boundary embedded within a server layout to minimize client JS.
 *
 * TODOs / Improvements:
 * - Keep this list minimal; move data fetching to RSC and lift non-interactive logic server-side.
 */
import React from 'react';

import { AppProvider } from '@/context/AppContext';
import { EditProvider } from '@/context/EditContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <EditProvider>{children}</EditProvider>
    </AppProvider>
  );
}
