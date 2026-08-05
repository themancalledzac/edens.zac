'use client';

import styles from './DensityTierControl.module.scss';

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

/**
 * Grid glyphs standing in for each tier, ordered large -> small. Purely decorative: the accessible
 * name comes from the tier's own label, so these are hidden from assistive tech. A cell count that
 * grows as photos shrink is the whole affordance — the raw density number is meaningless to a
 * visitor and runs backwards from what they see.
 */
const TIER_GLYPH_CELLS: Record<string, number> = { large: 1, medium: 4, small: 9 };

/** Fallback for a tier key with no glyph mapping, so an added tier degrades rather than vanishing. */
const DEFAULT_GLYPH_CELLS = 4;

/**
 * Segmented photo-size picker: the visitor-facing replacement for the raw 1-10 density slider.
 *
 * Rendered as a radiogroup rather than a set of toggle buttons because the options are mutually
 * exclusive and exactly one is always current — the same reason page sections are links, not
 * pressed chips. The active segment reuses FilterChip's fg/bg inversion, the one treatment in this
 * bar with adequate contrast.
 */
export function DensityTierControl({ tiers, activeKey, onSelect }: DensityTierControlProps) {
  return (
    <div className={styles.group} role="radiogroup" aria-label="Photo size">
      {tiers.map(tier => {
        const isActive = tier.key === activeKey;
        return (
          <button
            key={tier.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={tier.label}
            className={`${styles.segment} ${isActive ? styles.segmentActive : ''}`}
            onClick={() => onSelect(tier.value)}
          >
            <span className={styles.glyph} aria-hidden="true">
              {Array.from({ length: TIER_GLYPH_CELLS[tier.key] ?? DEFAULT_GLYPH_CELLS }, (_, i) => (
                <span key={i} className={styles.cell} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
