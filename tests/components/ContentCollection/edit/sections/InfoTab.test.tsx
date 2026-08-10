/**
 * Tests for the InfoTab date fields: the end-date input wiring, the soft-validation advisory,
 * and both clear buttons (which are `IconButton`s — the `type="button"` that keeps them from
 * submitting now comes from the primitive's default rather than from an inline attribute).
 *
 * A `role="status"` note ("End date is before the collection date.") renders only when both
 * dates are set AND the end date lexically precedes the start date (ISO strings compare
 * correctly under `<`). It is absent otherwise, including when either date is unset.
 */

import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { InfoTab } from '@/app/components/ContentCollection/edit/sections/InfoTab';
import { type CollectionUpdateRequest } from '@/app/types/Collection';
import { makeEdit, makeUpdateData } from '@/tests/fixtures/collectionEditFixtures';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/app/components/ui/TagsSelector/TagsSelector', () => ({
  __esModule: true,
  default: ({ emptyText }: { emptyText?: string }) => (
    <div data-testid="tags-selector">{emptyText}</div>
  ),
}));

function renderInfoTab(updateData: Partial<CollectionUpdateRequest>) {
  const setUpdateField = jest.fn();
  render(<InfoTab edit={makeEdit({ updateData: makeUpdateData(updateData), setUpdateField })} />);
  return { setUpdateField };
}

const WARNING = 'End date is before the collection date.';

describe('InfoTab — end-date soft validation', () => {
  it('renders the advisory when the end date is before the collection date', () => {
    renderInfoTab({ collectionDate: '2026-03-07', collectionEndDate: '2026-03-01' });
    expect(screen.getByRole('status')).toHaveTextContent(WARNING);
  });

  it('does not render the advisory when the end date equals the collection date', () => {
    renderInfoTab({ collectionDate: '2026-03-07', collectionEndDate: '2026-03-07' });
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('does not render the advisory when the end date is after the collection date', () => {
    renderInfoTab({ collectionDate: '2026-03-07', collectionEndDate: '2026-03-14' });
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('does not render the advisory when the end date is unset', () => {
    renderInfoTab({ collectionDate: '2026-03-07', collectionEndDate: undefined });
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('does not render the advisory when the start date is unset', () => {
    // The fourth combination: an end date alone has nothing to be "before".
    renderInfoTab({ collectionDate: undefined, collectionEndDate: '2026-03-01' });
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });
});

describe('InfoTab — end-date input wiring', () => {
  it('labels the end-date input so it is reachable by its accessible name', () => {
    renderInfoTab({ collectionEndDate: '2026-03-07' });
    expect(screen.getByLabelText('End date')).toHaveValue('2026-03-07');
  });

  it('renders an empty end-date input when the field is unset', () => {
    renderInfoTab({ collectionEndDate: undefined });
    expect(screen.getByLabelText('End date')).toHaveValue('');
  });

  it('writes the picked value through to collectionEndDate', () => {
    const { setUpdateField } = renderInfoTab({ collectionEndDate: undefined });

    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-03-07' } });

    expect(setUpdateField).toHaveBeenCalledWith('collectionEndDate', '2026-03-07');
  });

  it('clears to null (not empty string) via the clear button, so buildUpdatePayload sees a clear', () => {
    const { setUpdateField } = renderInfoTab({ collectionEndDate: '2026-03-07' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear end date' }));

    expect(setUpdateField).toHaveBeenCalledWith('collectionEndDate', null);
  });

  it('hides the clear button when no end date is set', () => {
    renderInfoTab({ collectionEndDate: undefined });
    expect(screen.queryByRole('button', { name: 'Clear end date' })).not.toBeInTheDocument();
  });

  it('labels the collection-date input too (retrofitted alongside the end date)', () => {
    renderInfoTab({ collectionDate: '2026-03-01' });
    expect(screen.getByLabelText('Collection Date')).toHaveValue('2026-03-01');
  });
});

describe('InfoTab — collection-date clear button', () => {
  it('clears to null (not empty string) via the clear button', () => {
    const { setUpdateField } = renderInfoTab({ collectionDate: '2026-03-01' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));

    expect(setUpdateField).toHaveBeenCalledWith('collectionDate', null);
  });

  it('hides the clear button when no collection date is set', () => {
    renderInfoTab({ collectionDate: undefined });
    expect(screen.queryByRole('button', { name: 'Clear date' })).not.toBeInTheDocument();
  });
});

describe('InfoTab — date clear buttons are non-submitting IconButtons', () => {
  it('keeps type="button" on both clear controls now that IconButton supplies it', () => {
    renderInfoTab({ collectionDate: '2026-03-01', collectionEndDate: '2026-03-07' });

    expect(screen.getByRole('button', { name: 'Clear date' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Clear end date' })).toHaveAttribute(
      'type',
      'button'
    );
  });

  it('hides the ✕ glyph from the accessibility tree so the aria-label is the only name', () => {
    renderInfoTab({ collectionDate: '2026-03-01' });

    const clear = screen.getByRole('button', { name: 'Clear date' });
    expect(clear.querySelector('[aria-hidden="true"]')).toHaveTextContent('✕');
  });
});

describe('InfoTab — the cover picker has moved to the grid', () => {
  it('no longer carries any cover control', () => {
    renderInfoTab({});
    expect(screen.queryByText('Cover image')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cover/i })).not.toBeInTheDocument();
  });
});
