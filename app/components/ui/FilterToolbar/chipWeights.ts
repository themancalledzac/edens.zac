import { type ReactNode } from 'react';

/**
 * Order of the page actions in the bar's upper tier, highest first. They always follow the
 * sections. Filters have no weight: they live in the wrap-reverse cluster below.
 */
export const CHIP_WEIGHT = {
  share: 400,
  contact: 300,
  passkey: 200,
  logout: 100,
} as const;

/** A page-level chip the bar renders in its upper tier, in weight order. */
export interface ToolbarExtra {
  key: string;
  weight: number;
  node: ReactNode;
}
