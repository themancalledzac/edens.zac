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

  it('renders a Plus icon, unpressed, with no text when not following', () => {
    wrap(<FollowButton collectionId={99} />);
    const button = screen.getByRole('button', { name: 'Follow collection' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.querySelector('.lucide-plus')).not.toBeNull();
    expect(button.querySelector('.lucide-check')).toBeNull();
    expect(button).toHaveTextContent('');
  });

  it('renders a Check icon, pressed, with no text when following', () => {
    wrap(<FollowButton collectionId={7} />);
    const button = screen.getByRole('button', { name: 'Unfollow collection' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.querySelector('.lucide-check')).not.toBeNull();
    expect(button.querySelector('.lucide-plus')).toBeNull();
    expect(button).toHaveTextContent('');
  });

  it('labels with the title when one is given', () => {
    wrap(
      <>
        <FollowButton collectionId={99} title="Iceland" />
        <FollowButton collectionId={7} title="Norway" />
      </>
    );
    expect(screen.getByRole('button', { name: 'Follow Iceland' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unfollow Norway' })).toBeInTheDocument();
  });

  it('falls back to "collection" for a blank title', () => {
    wrap(<FollowButton collectionId={99} title="   " />);
    expect(screen.getByRole('button', { name: 'Follow collection' })).toBeInTheDocument();
  });

  it('applies the bottom placement class', () => {
    wrap(
      <>
        <FollowButton collectionId={99} placement="bottom" />
        <FollowButton collectionId={98} />
      </>
    );
    const [bottom, top] = screen.getAllByRole('button');
    expect(bottom!.className).toContain('cornerToggleBottom');
    expect(top!.className).not.toContain('cornerToggleBottom');
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
