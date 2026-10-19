/** @jest-environment node */
import { type ReactElement, type ReactNode } from 'react';

import CommentsPage from '@/app/(site)/(admin)/comments/page';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { getAdminMessages } from '@/app/lib/api/messages';

jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/messages', () => ({ getAdminMessages: jest.fn() }));
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({ PageShell: jest.fn() }));
jest.mock('@/app/(site)/(admin)/comments/CommentsList', () => ({ CommentsList: jest.fn() }));

const principal = { isAdmin: true, email: 'a@example.com' };

const shellProps = async () => {
  const tree = (await CommentsPage()) as ReactElement<{ children?: ReactNode }>;
  expect(tree.type).toBe(PageShell);
  return tree.props as { me?: unknown };
};

describe('CommentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminMessages as jest.Mock).mockResolvedValue({ messages: [], total: 0 });
  });

  it('hands PageShell the server-resolved principal', async () => {
    (meServer as jest.Mock).mockResolvedValue(principal);
    expect((await shellProps()).me).toBe(principal);
  });

  it('falls back to null when meServer fails', async () => {
    (meServer as jest.Mock).mockRejectedValue(new Error('boom'));
    expect((await shellProps()).me).toBeNull();
  });
});
