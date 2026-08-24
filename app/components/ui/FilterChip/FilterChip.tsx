import Link from 'next/link';

import styles from './FilterChip.module.scss';

export type FilterChipTone = 'neutral' | 'film' | 'digital';
export type FilterChipState = 'available' | 'unavailable';

interface FilterChipBaseProps {
  /** Visible chip text (e.g. a tag, person, camera, or "Film"). */
  label: string;
  /** Optional contextual result count rendered as a muted badge. */
  count?: number;
  /**
   * Optional fixed-width trailing glyph (e.g. a sort direction arrow). Rendered whenever this
   * prop is provided, including as an empty string, so the chip's width never changes when the
   * value changes -- only the label switching in and out would do that.
   */
  trailing?: string;
  /** Whether this facet is currently selected. Drives the active style. */
  active?: boolean;
  /** Visual tone. 'film'/'digital' are neutral tri-state tints. */
  tone?: FilterChipTone;
  /** 'unavailable' greys out and disables the chip (3-state availability model). */
  state?: FilterChipState;
}

interface FilterChipButtonProps extends FilterChipBaseProps {
  /** Called when the chip is activated (click). Not called while unavailable. */
  onToggle: () => void;
  href?: never;
  scroll?: never;
}

interface FilterChipLinkProps extends FilterChipBaseProps {
  /** Destination for a navigating chip. Mutually exclusive with {@link FilterChipButtonProps.onToggle}. */
  href: string;
  onToggle?: never;
  /**
   * Forwarded to `next/link`. Defaults to `false`, which is right for a chip that swaps a `?tab=`
   * section of the page it already sits on — scrolling to the top there would throw the reader's
   * position away for no reason. Pass `true` for a chip that navigates to a different page, where
   * keeping the old scroll offset lands the reader partway down a page they have never seen.
   */
  scroll?: boolean;
}

/**
 * Discriminated on `href`: a chip either toggles a facet in place (`onToggle`) or navigates
 * (`href`), never both. The union is what stops a caller half-wiring one as the other.
 */
export type FilterChipProps = FilterChipButtonProps | FilterChipLinkProps;

/**
 * Canonical filter chip. Renders a real <button> with aria-pressed for in-place facet toggles, or
 * a <Link> with aria-current for chips that navigate — mutually-exclusive page sections addressed
 * by a search param, which are semantically links, not pressed toggles. Both variants share one
 * set of styles so a sectioned page's bar is visually indistinguishable from any other.
 *
 * The link variant also carries plain cross-page navigation — `AdminCard`'s four destinations on
 * `/user`. Those pass `scroll` so the jump behaves like a normal link; see the prop's docblock.
 *
 * 'unavailable' disables the button variant; the link variant degrades to an inert span, since a
 * disabled anchor is not a thing the platform provides.
 */
export function FilterChip({
  label,
  count,
  trailing,
  active = false,
  tone = 'neutral',
  state = 'available',
  href,
  scroll = false,
  onToggle,
}: FilterChipProps) {
  const unavailable = state === 'unavailable';
  const classes = [
    styles.chip,
    active ? styles.active : null,
    tone !== 'neutral' ? styles[tone] : null,
    unavailable ? styles.unavailable : null,
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {label}
      {trailing !== undefined && <span className={styles.trailing}>{trailing}</span>}
      {count !== undefined && (
        <span className={styles.count} aria-hidden="true">
          {count}
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
        aria-current={active ? 'page' : undefined}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={active}
      disabled={unavailable}
      onClick={onToggle}
    >
      {body}
    </button>
  );
}
