/**
 * Tests for SelectsContext — per-collection Selects state with an optimistic toggle
 * that rolls back on a failed persist. The Probe renders the current selectedIds joined
 * and a button that toggles id 42, so each spec asserts the rendered id list before/after.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SelectsProvider, useSelects } from '@/app/components/ContentCollection/SelectsContext';
import { addSelect, removeSelect } from '@/app/lib/api/selects';

jest.mock('@/app/lib/api/selects', () => ({
  addSelect: jest.fn(),
  removeSelect: jest.fn(),
}));

const addMock = addSelect as jest.Mock;
const removeMock = removeSelect as jest.Mock;

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
    addMock.mockResolvedValue();
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
    removeMock.mockResolvedValue();
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
});
