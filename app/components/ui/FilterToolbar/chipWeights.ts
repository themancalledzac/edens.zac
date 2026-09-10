import { type ReactNode } from 'react';

/**
 * Order of the bar's upper tier, highest first. Sections lead; page actions follow. Filters have
 * no weight: they live in the wrap-reverse cluster below and never mix with these.
 */
export const CHIP_WEIGHT = {
  sections: 500,
  share: 400,
  contact: 300,
  passkey: 200,
} as const;

/** A page-level chip the bar renders in its upper tier, in weight order. */
export interface ToolbarExtra {
  key: string;
  weight: number;
  node: ReactNode;
}
