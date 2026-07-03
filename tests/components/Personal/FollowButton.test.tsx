/**
 * Tests for FollowButton — the collection follow/unfollow toggle. Mirrors SaveHeart: it self-gates
 * on an active FollowsProvider (mounted only for logged-in viewers), rendering nothing when no
 * provider is present. `wrap` mounts a FollowsProvider around the button.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { FollowButton } from '@/app/components/Personal/FollowButton';
import { FollowsProvider, useFollows } from '@/app/components/Personal/FollowsContext';
import { addFollow, removeFollow } from '@/app/lib/api/personal';

jest.mock('@/app/lib/api/personal', () => ({
  addFollow: jest.fn(),
  removeFollow: jest.fn(),
}));

beforeEach(() => {
  // toggle calls `.catch()` on the persist result, so both must return a promise.
  (addFollow as jest.Mock).mockImplementation(() => Promise.resolve());
  (removeFollow as jest.Mock).mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  jest.clearAllMocks();
});

function wrap(ui: ReactNode, initialFollowedIds: number[] = [7]) {
  return render(<FollowsProvider initialFollowedIds={initialFollowedIds}>{ui}</FollowsProvider>);
}

describe('FollowButton', () => {
  it('renders nothing without a FollowsProvider (anonymous viewer)', () => {
    const { container } = render(<FollowButton collectionId={7} />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders a Follow button inside a FollowsProvider', () => {
    wrap(<FollowButton collectionId={99} />);
    expect(screen.getByRole('button', { name: /follow collection/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Follow');
  });

  it('renders a pressed "Following" button for an already-followed collection', () => {
    wrap(<FollowButton collectionId={7} />);
    const button = screen.getByRole('button', { name: /unfollow collection/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Following');
  });

  it('toggles the follow on click', () => {
    function Probe() {
      const follows = useFollows();
      return <span data-testid="ids">{[...(follows?.followedIds ?? [])].join(',')}</span>;
    }
    wrap(
      <>
        <FollowButton collectionId={7} />
        <Probe />
      </>
    );
    expect(screen.getByTestId('ids')).toHaveTextContent('7');

    fireEvent.click(screen.getByRole('button', { name: /unfollow collection/i }));
    expect(screen.getByTestId('ids')).toHaveTextContent('');
    expect(removeFollow).toHaveBeenCalledWith(7);
  });
});
