/**
 * Tests for FollowsProvider's optimistic toggle + rollback. Mirrors SavesContext: on toggle the
 * followed Set updates immediately; if the persist call rejects, the membership for that id rolls
 * back to its pre-toggle value. Persist is mocked so we can drive both the resolve and reject paths.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { FollowsProvider, useFollows } from '@/app/components/Personal/FollowsContext';
import { addFollow, removeFollow } from '@/app/lib/api/personal';

jest.mock('@/app/lib/api/personal', () => ({
  addFollow: jest.fn(),
  removeFollow: jest.fn(),
}));

// Silence the expected rollback error log so it doesn't pollute test output.
jest.mock('@/app/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

beforeEach(() => {
  (addFollow as jest.Mock).mockReset();
  (removeFollow as jest.Mock).mockReset();
});

/** Renders the provider around a probe that exposes the followed ids and a toggle for `id`. */
function setup(initialFollowedIds: number[], id: number) {
  function Probe() {
    const follows = useFollows();
    return (
      <>
        <span data-testid="ids">{[...(follows?.followedIds ?? [])].join(',')}</span>
        <button type="button" onClick={() => follows?.toggle(id)}>
          toggle
        </button>
      </>
    );
  }
  render(
    <FollowsProvider initialFollowedIds={initialFollowedIds}>
      <Probe />
    </FollowsProvider>
  );
}

describe('FollowsProvider toggle', () => {
  it('rolls back a follow when the persist rejects', async () => {
    (addFollow as jest.Mock).mockRejectedValue(new Error('nope'));
    setup([], 7);
    expect(screen.getByTestId('ids')).toHaveTextContent('');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    // Optimistic follow is applied synchronously.
    expect(screen.getByTestId('ids')).toHaveTextContent('7');

    // The rejected persist rolls the id back out.
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent(''));
    expect(addFollow).toHaveBeenCalledWith(7);
  });

  it('rolls back an unfollow when the persist rejects', async () => {
    (removeFollow as jest.Mock).mockRejectedValue(new Error('nope'));
    setup([7], 7);
    expect(screen.getByTestId('ids')).toHaveTextContent('7');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    // Optimistic unfollow is applied synchronously.
    expect(screen.getByTestId('ids')).toHaveTextContent('');

    // The rejected persist restores the id.
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('7'));
    expect(removeFollow).toHaveBeenCalledWith(7);
  });

  it('keeps the optimistic follow when the persist resolves', async () => {
    (addFollow as jest.Mock).mockImplementation(() => Promise.resolve());
    setup([], 7);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    });
    expect(screen.getByTestId('ids')).toHaveTextContent('7');
    expect(addFollow).toHaveBeenCalledWith(7);
  });

  it('settles correctly on two rapid toggles before a re-render', async () => {
    // Both persists resolve; the point is the SECOND click must observe the FIRST click's result
    // (not a stale closed-over Set) so it fires the opposite direction and the net state is empty.
    (addFollow as jest.Mock).mockImplementation(() => Promise.resolve());
    (removeFollow as jest.Mock).mockImplementation(() => Promise.resolve());
    setup([], 7);

    await act(async () => {
      const button = screen.getByRole('button', { name: 'toggle' });
      fireEvent.click(button); // not-following -> following (add)
      fireEvent.click(button); // following -> not-following (remove), keyed off the first result
    });

    // Net effect of follow-then-unfollow is the original empty set.
    expect(screen.getByTestId('ids')).toBeEmptyDOMElement();
    // Each direction fired exactly once — proving the second toggle didn't re-read a stale `false`.
    expect(addFollow).toHaveBeenCalledTimes(1);
    expect(addFollow).toHaveBeenCalledWith(7);
    expect(removeFollow).toHaveBeenCalledTimes(1);
    expect(removeFollow).toHaveBeenCalledWith(7);
  });
});
