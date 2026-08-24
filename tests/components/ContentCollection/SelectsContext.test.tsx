/**
 * Tests for SelectsContext — per-collection Selects state with an optimistic toggle
 * that rolls back on a failed persist. The Probe renders the current selectedIds joined
 * and a button that toggles id 42, so each spec asserts the rendered id list before/after.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';

import { SelectsProvider, useSelects } from '@/app/components/ContentCollection/SelectsContext';
import { addSelect, removeSelect } from '@/app/lib/api/selects';

jest.mock('@/app/lib/api/selects', () => ({
  addSelect: jest.fn(),
  removeSelect: jest.fn(),
}));

const addMock = addSelect as jest.Mock;
const removeMock = removeSelect as jest.Mock;

beforeEach(() => {
  // Default both persists to resolve; reject-path specs override per test. Use mockImplementation
  // (not mockResolvedValue(undefined)) to satisfy both tsc and eslint's unicorn/no-useless-undefined.
  addMock.mockImplementation(() => Promise.resolve());
  removeMock.mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  jest.clearAllMocks();
});

function Probe() {
  const selects = useSelects();
  if (!selects) return <div>no-ctx</div>;
  return (
    <div>
      <span data-testid="ids">{[...selects.selectedIds].join(',')}</span>
      <button type="button" onClick={() => selects.toggle(42)}>
        toggle
      </button>
    </div>
  );
}

/**
 * Renders inside StrictMode with an `onChange` spy. StrictMode is the point, not incidental: it
 * double-invokes state updater functions in development, which is what exposed a notifier being
 * called from inside one.
 */
function renderWithOnChange(initial: number[], onChange: (ids: number[]) => void) {
  return render(
    <StrictMode>
      <SelectsProvider collectionId={3} initialSelectedIds={initial} onChange={onChange}>
        <Probe />
      </SelectsProvider>
    </StrictMode>
  );
}

function renderWithProvider(initial: number[]) {
  return render(
    <SelectsProvider collectionId={3} initialSelectedIds={initial}>
      <Probe />
    </SelectsProvider>
  );
}

describe('SelectsContext', () => {
  it('returns null outside a provider', () => {
    render(<Probe />);
    expect(screen.getByText('no-ctx')).toBeInTheDocument();
  });

  it('seeds from initialSelectedIds', () => {
    renderWithProvider([1, 2]);
    expect(screen.getByTestId('ids')).toHaveTextContent('1,2');
  });

  it('optimistically adds then persists', async () => {
    renderWithProvider([]);

    fireEvent.click(screen.getByText('toggle'));

    expect(screen.getByTestId('ids')).toHaveTextContent('42');
    expect(addMock).toHaveBeenCalledWith(3, 42);
  });

  it('rolls back the optimistic add when the request fails', async () => {
    addMock.mockRejectedValue(new Error('nope'));
    renderWithProvider([]);

    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent(''));
    expect(addMock).toHaveBeenCalledWith(3, 42);
  });

  it('optimistically removes then persists', async () => {
    renderWithProvider([42]);

    fireEvent.click(screen.getByText('toggle'));

    expect(screen.getByTestId('ids')).toHaveTextContent('');
    expect(removeMock).toHaveBeenCalledWith(42);
  });

  it('rolls back the optimistic remove when the request fails', async () => {
    removeMock.mockRejectedValue(new Error('nope'));
    renderWithProvider([42]);

    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('42'));
    expect(removeMock).toHaveBeenCalledWith(42);
  });

  /**
   * Guards C3. `onChange` used to be called from inside the `setSelectedIds` updaters. Updaters must
   * be pure, and StrictMode double-invokes them in development, so every toggle notified the owner
   * twice with the same list. The owner is a setState so the duplicate was invisible — which is why
   * these assert call counts, not just payloads.
   */
  describe('onChange notifier', () => {
    it('fires exactly once per toggle under StrictMode', () => {
      const onChange = jest.fn();
      renderWithOnChange([], onChange);
      onChange.mockClear();

      fireEvent.click(screen.getByText('toggle'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([42]);
    });

    it('fires exactly once more when a failed persist rolls back', async () => {
      addMock.mockRejectedValue(new Error('nope'));
      const onChange = jest.fn();
      renderWithOnChange([], onChange);
      onChange.mockClear();

      fireEvent.click(screen.getByText('toggle'));
      await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent(''));

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(1, [42]);
      expect(onChange).toHaveBeenNthCalledWith(2, []);
    });

    it('does not fire on mount, because seeding is not a change', () => {
      const onChange = jest.fn();
      renderWithOnChange([1, 2], onChange);

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
