/**
 * Tests for SavesProvider's optimistic toggle + rollback. On toggle the saved Set updates
 * immediately; if the persist call rejects, the membership for that id rolls back to its pre-toggle
 * value. Persist is mocked so we can drive both the resolve and reject paths.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SavesProvider, useSaves } from '@/app/components/Personal/SavesContext';
import { addSave, removeSave } from '@/app/lib/api/personal';

jest.mock('@/app/lib/api/personal', () => ({
  addSave: jest.fn(),
  removeSave: jest.fn(),
}));

// Silence the expected rollback error log so it doesn't pollute test output.
jest.mock('@/app/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

beforeEach(() => {
  (addSave as jest.Mock).mockReset();
  (removeSave as jest.Mock).mockReset();
});

/** Renders the provider around a probe that exposes the saved ids and a toggle for `id`. */
function setup(initialSavedIds: number[], id: number) {
  function Probe() {
    const saves = useSaves();
    return (
      <>
        <span data-testid="ids">{[...(saves?.savedIds ?? [])].join(',')}</span>
        <button type="button" onClick={() => saves?.toggle(id)}>
          toggle
        </button>
      </>
    );
  }
  render(
    <SavesProvider initialSavedIds={initialSavedIds}>
      <Probe />
    </SavesProvider>
  );
}

describe('SavesProvider toggle', () => {
  it('rolls back an add when the persist rejects', async () => {
    (addSave as jest.Mock).mockRejectedValue(new Error('nope'));
    setup([], 42);
    expect(screen.getByTestId('ids')).toHaveTextContent('');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    // Optimistic add is applied synchronously.
    expect(screen.getByTestId('ids')).toHaveTextContent('42');

    // The rejected persist rolls the id back out.
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent(''));
    expect(addSave).toHaveBeenCalledWith(42);
  });

  it('rolls back a remove when the persist rejects', async () => {
    (removeSave as jest.Mock).mockRejectedValue(new Error('nope'));
    setup([42], 42);
    expect(screen.getByTestId('ids')).toHaveTextContent('42');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    // Optimistic remove is applied synchronously.
    expect(screen.getByTestId('ids')).toHaveTextContent('');

    // The rejected persist restores the id.
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('42'));
    expect(removeSave).toHaveBeenCalledWith(42);
  });

  it('keeps the optimistic add when the persist resolves', async () => {
    (addSave as jest.Mock).mockImplementation(() => Promise.resolve());
    setup([], 42);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    });
    expect(screen.getByTestId('ids')).toHaveTextContent('42');
    expect(addSave).toHaveBeenCalledWith(42);
  });

  it('settles correctly on two rapid toggles before a re-render', async () => {
    // Both persists resolve; the point is the SECOND click must observe the FIRST click's result
    // (not a stale closed-over Set) so it fires the opposite direction and the net state is empty.
    (addSave as jest.Mock).mockImplementation(() => Promise.resolve());
    (removeSave as jest.Mock).mockImplementation(() => Promise.resolve());
    setup([], 42);

    await act(async () => {
      const button = screen.getByRole('button', { name: 'toggle' });
      fireEvent.click(button); // unsaved -> saved (add)
      fireEvent.click(button); // saved -> unsaved (remove), keyed off the first click's result
    });

    // Net effect of add-then-remove is the original empty set.
    expect(screen.getByTestId('ids')).toBeEmptyDOMElement();
    // Each direction fired exactly once — proving the second toggle didn't re-read a stale `false`.
    expect(addSave).toHaveBeenCalledTimes(1);
    expect(addSave).toHaveBeenCalledWith(42);
    expect(removeSave).toHaveBeenCalledTimes(1);
    expect(removeSave).toHaveBeenCalledWith(42);
  });
});
