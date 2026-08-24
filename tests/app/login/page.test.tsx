/** @jest-environment node */
/**
 * Route tests for app/login/page.tsx.
 *
 * Two things are covered. The session branch — a signed-in visitor is bounced to `/user` and never
 * sees the form. And the shell the page renders: `/login` and `/invite/[token]` used to own
 * byte-identical copies of `page.module.scss` and now share `app/styles/auth-card.module.scss`, so
 * the render case walks the returned tree and checks main/card/heading are all styled from the
 * module the page imports. `tests/app/invite/page.test.tsx` covers the other route's branches, and
 * `tests/styles/scssImportResolution.test.ts` is what proves the shared specifier points at a file
 * that exists — jest's SCSS proxy answers any key on any path, so a class name assertion cannot.
 */

import { type ReactElement, type ReactNode } from 'react';

import authCard from '@/app/styles/auth-card.module.scss';

// `redirect()` works by throwing a sentinel; mirror that so the page's control flow is exercised
// rather than falling through to the render path.
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(),
}));

// LoginForm is a client component — stub it for the server-env test.
jest.mock('@/app/login/LoginForm', () => ({
  __esModule: true,
  default: () => 'LoginForm',
}));

import { redirect } from 'next/navigation';

import { meServer } from '@/app/lib/api/auth';
import LoginPage from '@/app/login/page';

type StyledElement = ReactElement<{ className?: string; children?: ReactNode }>;

/** The first child of an element, asserted present so the callers stay free of optional chaining. */
function firstChild(element: StyledElement): StyledElement {
  const { children } = element.props;
  const first = Array.isArray(children) ? children[0] : children;
  if (!first || typeof first !== 'object') throw new Error('expected an element child');
  return first as StyledElement;
}

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (meServer as jest.Mock).mockResolvedValue(null);
  });

  it('redirects an already-signed-in visitor to their user page', async () => {
    (meServer as jest.Mock).mockResolvedValue({ email: 'me@example.com', isAdmin: false });

    await expect(LoginPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/user');
  });

  it('renders without redirecting when no session resolves', async () => {
    const result = await LoginPage();

    expect(result).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('styles main, card and heading from the auth-card module it imports', async () => {
    const main = (await LoginPage()) as StyledElement;

    expect(main.type).toBe('main');
    expect(main.props.className).toBe(authCard.page);

    const card = firstChild(main);
    expect(card.type).toBe('div');
    expect(card.props.className).toBe(authCard.card);

    const heading = firstChild(card);
    expect(heading.type).toBe('h1');
    expect(heading.props.className).toBe(authCard.heading);
    expect(heading.props.children).toBe('Sign in');
  });
});
