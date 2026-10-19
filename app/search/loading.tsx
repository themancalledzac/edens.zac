import { PageShell } from '@/app/components/ui/PageShell/PageShell';

import { SearchLoadingBody } from './SearchLoadingBody';

/**
 * Loading UI for `/search`. Renders the real shell and heading, unlike the root spinner, so only
 * the grid appears when data lands.
 */
export default function SearchLoading() {
  return (
    <PageShell>
      <SearchLoadingBody />
    </PageShell>
  );
}
