/** @jest-environment node */
import type { ReactElement } from 'react';

import MetadataPage from '@/app/(admin)/metadata/page';
import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import { meServer } from '@/app/lib/api/auth';
import { getMetadata } from '@/app/lib/api/collections';

jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/collections', () => ({ getMetadata: jest.fn() }));
jest.mock('@/app/components/MetadataPage/MetadataPageClient', () => ({
  MetadataPageClient: jest.fn(),
}));
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({ PageShell: jest.fn() }));

const principal = { isAdmin: true, email: 'a@example.com' };

const clientProps = async () => {
  const tree = (await MetadataPage()) as ReactElement;
  expect(tree.type).toBe(MetadataPageClient);
  return tree.props as { me?: unknown };
};

describe('MetadataPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMetadata as jest.Mock).mockResolvedValue({ tags: [], people: [], locations: [] });
  });

  it('hands MetadataPageClient the server-resolved principal', async () => {
    (meServer as jest.Mock).mockResolvedValue(principal);
    expect((await clientProps()).me).toBe(principal);
  });

  it('falls back to null when meServer fails', async () => {
    (meServer as jest.Mock).mockRejectedValue(new Error('boom'));
    expect((await clientProps()).me).toBeNull();
  });
});
