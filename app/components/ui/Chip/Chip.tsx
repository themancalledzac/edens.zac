import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { type Ref } from 'react';

import styles from './Chip.module.scss';

interface ChipBaseProps {
  /** The control's name. Shown beside the icon, or as the only text when there is no icon. */
  label: string;
  /** 16px icon drawn before the label. Look it up in `CHIP_ICONS`. */
  icon?: LucideIcon;
  /** Draws the icon upside down, e.g. the Order arrow for the other direction. */
  iconFlipped?: boolean;
  /** Hides the label under 768px so the chip is icon only. Needs `icon`. */
  hideLabelBelow?: boolean;
  /** Hides the label at every width, for a chip whose icon is its whole meaning. Needs `icon`. */
  hideLabel?: boolean;
  /** Small muted numeral after the icon and label. */
  count?: number;
  /** Icon drawn after the label, e.g. the `X` on an active-filter badge. */
  trailingIcon?: LucideIcon;
  /**
   * Selected, on, or current. Gives the 2px underline. On a plain button toggle, passing it (even
   * `false`) also sets `aria-pressed`; leave it out for a one-shot action.
   */
  active?: boolean;
  /** 'unavailable' fades and disables the chip. */
  state?: 'available' | 'unavailable';
  /**
   * Accessible name when the label alone does not say it, e.g. "Order: oldest first". An icon-only
   * chip always gets an `aria-label`: this, or the label, plus the count.
   */
  ariaLabel?: string;
}

interface ChipButtonProps extends ChipBaseProps {
  onToggle: () => void;
  href?: never;
  scroll?: never;
  ref?: Ref<HTMLButtonElement>;
  /** Makes the chip a dropdown trigger. `open` drives `aria-expanded` and the active look. */
  menu?: { open: boolean };
  /** Renders the chip as one option of a `ChipRow` radiogroup, checked when `active`. */
  radio?: boolean;
}

interface ChipLinkProps extends ChipBaseProps {
  href: string;
  onToggle?: never;
  /** Forwarded to `next/link`. Defaults to `false`, right for a `?tab=` switch on the same page. */
  scroll?: boolean;
  ref?: never;
  menu?: never;
  radio?: never;
}

/** A chip either acts in place (`onToggle`) or navigates (`href`), never both. */
export type ChipProps = ChipButtonProps | ChipLinkProps;

/**
 * One cell of a {@link ChipRow}: an icon, a label, or both, with an optional count. No box: the
 * row draws the underline and dividers, and an active chip adds its own 2px underline.
 *
 * Renders a `<button>` for toggles, actions, dropdown triggers and radio options, or a `<Link>`
 * with `aria-current="page"` when it navigates. An unavailable link degrades to an inert span.
 */
export function Chip({
  label,
  icon: Icon,
  iconFlipped = false,
  hideLabelBelow = false,
  hideLabel = false,
  count,
  trailingIcon: TrailingIcon,
  active,
  state = 'available',
  ariaLabel,
  href,
  scroll = false,
  onToggle,
  ref,
  menu,
  radio = false,
}: ChipProps) {
  const unavailable = state === 'unavailable';
  const lit = active === true || menu?.open === true;
  const iconOnly = Icon !== undefined && (hideLabelBelow || hideLabel);
  const name =
    iconOnly && count !== undefined ? `${ariaLabel ?? label}, ${count}` : (ariaLabel ?? label);
  const accessibleName = iconOnly || ariaLabel !== undefined ? name : undefined;

  const classes = [styles.chip, lit ? styles.active : null, unavailable ? styles.unavailable : null]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {Icon && (
        <Icon
          className={iconFlipped ? `${styles.icon} ${styles.flipped}` : styles.icon}
          aria-hidden="true"
        />
      )}
      {!(Icon && hideLabel) && (
        <span className={iconOnly ? styles.labelWide : undefined}>{label}</span>
      )}
      {count !== undefined && (
        <span className={styles.count} aria-hidden="true">
          {count}
        </span>
      )}
      {TrailingIcon && <TrailingIcon className={styles.trailingIcon} aria-hidden="true" />}
      {menu && (
        <span className={styles.caret} aria-hidden="true">
          {menu.open ? '▴' : '▾'}
        </span>
      )}
    </>
  );

  if (href !== undefined) {
    if (unavailable) {
      return <span className={classes}>{body}</span>;
    }
    return (
      <Link
        href={href}
        scroll={scroll}
        className={classes}
        aria-label={accessibleName}
        aria-current={active === true ? 'page' : undefined}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      role={radio ? 'radio' : undefined}
      className={classes}
      aria-label={accessibleName}
      aria-checked={radio ? active === true : undefined}
      aria-pressed={!radio && !menu && active !== undefined ? active : undefined}
      aria-expanded={menu?.open}
      aria-haspopup={menu ? 'true' : undefined}
      disabled={unavailable}
      onClick={onToggle}
    >
      {body}
    </button>
  );
}
