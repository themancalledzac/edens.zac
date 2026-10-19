'use client';

import { type LucideIcon } from 'lucide-react';

import { Chip } from '@/app/components/ui/Chip/Chip';
import { CHIP_ICONS } from '@/app/components/ui/Chip/chipIcons';
import { ChipRow } from '@/app/components/ui/Chip/ChipRow';

/** One selectable photo-size preset, already resolved to the active viewport's density scale. */
export interface DensityTier {
  key: string;
  /** Full accessible name, e.g. "Large photos". Never the raw density number. */
  label: string;
  /** Density value on the active viewport's scale. */
  value: number;
}

interface DensityTierControlProps {
  tiers: readonly DensityTier[];
  /** Key of the tier nearest the current density. Highlighted, but never written back. */
  activeKey: string;
  onSelect: (value: number) => void;
}

/** One icon per tier, all drawn at the same 16px. An unknown tier key falls back to the 2x2 grid. */
const TIER_ICONS: Record<string, LucideIcon> = {
  large: CHIP_ICONS.densityLarge,
  medium: CHIP_ICONS.densityMedium,
  small: CHIP_ICONS.densitySmall,
};

/**
 * Photo-size picker: a radiogroup of icon-only chips, one per tier. A radiogroup because exactly
 * one tier is always current. Each option's accessible name is the tier's label.
 */
export function DensityTierControl({ tiers, activeKey, onSelect }: DensityTierControlProps) {
  return (
    <ChipRow radioGroupLabel="Photo size" underline={false} wrap="none">
      {tiers.map(tier => (
        <Chip
          key={tier.key}
          radio
          label={tier.label}
          icon={TIER_ICONS[tier.key] ?? CHIP_ICONS.densityMedium}
          hideLabel
          active={tier.key === activeKey}
          onToggle={() => onSelect(tier.value)}
        />
      ))}
    </ChipRow>
  );
}
