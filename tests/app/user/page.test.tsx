/** @jest-environment node */
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/user', () => ({ getUserPage: jest.fn() }));
jest.mock('@/app/components/ContentCollection/CollectionPage', () => ({
  __esModule: true,
  default: ({ collection }: { collection: { slug: string } }) =>
    `CollectionPage:${collection.slug}`,
}));

import { meServer } from '@/app/lib/api/auth';
import { getUserPage } from '@/app/lib/api/user';
import UserPage from '@/app/user/page';

describe('UserPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls notFound() when anonymous', async () => {
    (meServer as jest.Mock).mockResolvedValue(null);
    await expect(UserPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(getUserPage).not.toHaveBeenCalled();
  });

  it('renders CollectionPage with the synthetic collection when authed', async () => {
    (meServer as jest.Mock).mockResolvedValue({
      email: 'c@x.com',
      role: 'CLIENT',
      mfaSatisfied: true,
      galleries: [],
    });
    (getUserPage as jest.Mock).mockResolvedValue({ slug: 'user', type: 'PARENT', content: [] });
    const result = await UserPage();
    expect(result).toBeTruthy();
  });
});
