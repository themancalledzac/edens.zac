import { render } from '@testing-library/react';

import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import type { MeResponse } from '@/app/types/Auth';

jest.mock('@/app/lib/api/core');
jest.mock('@/app/components/ContentCollection/edit/collectionEditUtils', () => ({
  revalidateLocationCaches: jest.fn(() => Promise.resolve()),
  revalidateMetadataCache: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  PageShell: jest.fn(({ children }: { children: unknown }) => children),
}));

describe('MetadataPageClient me forwarding', () => {
  it('forwards me to PageShell', () => {
    const me = { isAdmin: true, email: 'a@example.com' } as MeResponse;
    render(<MetadataPageClient tags={[]} people={[]} locations={[]} me={me} />);
    expect((PageShell as jest.Mock).mock.calls[0]![0].me).toBe(me);
  });
});
