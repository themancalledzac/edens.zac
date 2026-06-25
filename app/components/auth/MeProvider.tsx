'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { type MeResponse } from '@/app/types/Auth';

const MeContext = createContext<MeResponse | null>(null);

/**
 * Makes the server-resolved principal available to deep client consumers
 * (the Selects star, the rating slider) without prop-drilling. `me` is the
 * value from `meServer()`; pass `null` for anonymous viewers.
 */
export function MeProvider({ me, children }: { me: MeResponse | null; children: ReactNode }) {
  return <MeContext value={me}>{children}</MeContext>;
}

/** The current principal, or `null` when anonymous / no provider is mounted. */
export function useMe(): MeResponse | null {
  return useContext(MeContext);
}
