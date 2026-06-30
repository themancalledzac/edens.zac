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
 * Builds the "up to parent" breadcrumb trail for a collection page.
 *
 * - No `via` param → `Home › {current}`.
 * - Valid `via` param → `Home › {via-collection} › {current}`.
 *
 * The current (last) crumb renders as plain text (no `href`); the `via` slug
 * links to `/{slug}` with a humanized-slug label.
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
