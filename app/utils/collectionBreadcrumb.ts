import type { BreadcrumbItem } from '@/app/components/Breadcrumb/Breadcrumb';

import { humanizeSlug } from './stringUtils';

/** Inputs for {@link buildCollectionBreadcrumb}. */
export interface CollectionBreadcrumbInput {
  /** Current collection's title (the final, hrefless crumb). */
  currentTitle: string;
  /** Current collection's slug; humanized as a fallback when the title is blank. */
  currentSlug?: string;
  /** `?via=<slug>` arrived-from collection; the breadcrumb renders only when set. */
  via?: string;
}

/**
 * Up-trail for a collection page: `[]` when there's no `via` parent, else
 * `Home › {via} › {current}` (the current crumb is plain text).
 */
export function buildCollectionBreadcrumb({
  currentTitle,
  currentSlug,
  via,
}: CollectionBreadcrumbInput): BreadcrumbItem[] {
  const viaSlug = via?.trim();
  if (!viaSlug) return [];

  const currentLabel =
    currentTitle.trim() || (currentSlug ? humanizeSlug(currentSlug) : '') || 'Untitled';
  return [
    { label: 'Home', href: '/' },
    { label: humanizeSlug(viaSlug), href: `/${viaSlug}` },
    { label: currentLabel },
  ];
}
