import type { BreadcrumbItem } from '@/app/components/Breadcrumb/Breadcrumb';

import { humanizeSlug } from './stringUtils';

/** Inputs for {@link buildCollectionBreadcrumb}. */
export interface CollectionBreadcrumbInput {
  /** The current collection's display title (becomes the final, hrefless crumb). */
  currentTitle: string;
  /** The current collection's slug — humanized fallback when the title is blank. */
  currentSlug?: string;
  /**
   * Optional `?via=<slug>` query value: the collection the visitor arrived from
   * (e.g. clicked a Related card). When present and non-blank, it becomes a
   * linked intermediate crumb between Home and the current collection.
   */
  via?: string;
}

/**
 * Builds the "up to parent" breadcrumb trail for a collection page (Track B,
 * design decision #3).
 *
 * - No `via` param → `Home › {current}`.
 * - Valid `via` param → `Home › {via-collection} › {current}`.
 *
 * The current (last) crumb always renders as plain text (no `href`), per
 * WAI-ARIA breadcrumb practice. The `via` slug links to `/{slug}` and uses a
 * humanized slug as its label, since we only have the slug (no fetched title)
 * at this point and don't want a second backend round-trip.
 *
 * The "highest featured tag" breadcrumb variant is deferred (depends on A2).
 */
export function buildCollectionBreadcrumb({
  currentTitle,
  currentSlug,
  via,
}: CollectionBreadcrumbInput): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  const viaSlug = via?.trim();
  if (viaSlug) {
    items.push({ label: humanizeSlug(viaSlug), href: `/${viaSlug}` });
  }

  const currentLabel =
    currentTitle.trim() || (currentSlug ? humanizeSlug(currentSlug) : '') || 'Untitled';
  items.push({ label: currentLabel });

  return items;
}
