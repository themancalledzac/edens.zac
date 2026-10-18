/**
 * LocationPage forwards the principal it already resolves with `meServer` to the shell.
 */

import { render } from '@testing-library/react';
import { type ReactNode } from 'react';

import LocationPage from '@/app/components/LocationPage/LocationPage';
import { meServer } from '@/app/lib/api/auth';
import { listFollowedCollectionIdsServer } from '@/app/lib/api/personal';
import { type MeResponse } from '@/app/types/Auth';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({ listFollowedCollectionIdsServer: jest.fn() }));
jest.mock('@/app/utils/ssrViewport', () => ({ resolveSsrViewport: jest.fn() }));
jest.mock('@/app/components/LocationPage/LocationPageClient', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  __esModule: true,
  PageShell: ({ children, me }: { children: ReactNode; me?: { email: string } | null }) => (
    <div data-me={me === undefined ? 'unresolved' : (me?.email ?? 'anonymous')}>{children}</div>
  ),
}));

const props = { locationName: 'Alps', collections: [], images: [], coverImage: null };

beforeEach(() => {
  jest.mocked(resolveSsrViewport).mockResolvedValue({
    contentWidth: 900,
    viewportHeight: 700,
    isMobile: false,
  });
  jest.mocked(listFollowedCollectionIdsServer).mockResolvedValue({ ok: true, items: [] });
});

describe('LocationPage', () => {
  it('passes the resolved principal to the shell', async () => {
    jest.mocked(meServer).mockResolvedValue({ email: 'a@b.c' } as MeResponse);
    const { container } = render(await LocationPage(props));
    expect(container.querySelector('[data-me]')).toHaveAttribute('data-me', 'a@b.c');
  });

  it('passes null to the shell for an anonymous viewer', async () => {
    jest.mocked(meServer).mockResolvedValue(null);
    const { container } = render(await LocationPage(props));
    expect(container.querySelector('[data-me]')).toHaveAttribute('data-me', 'anonymous');
  });
});
