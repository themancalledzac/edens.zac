/**
 * Tests for the InfoTab date fields: the end-date input wiring and the soft-validation
 * advisory.
 *
 * A `role="status"` note ("End date is before the collection date.") renders only when both
 * dates are set AND the end date lexically precedes the start date (ISO strings compare
 * correctly under `<`). It is absent otherwise, including when either date is unset.
 */

import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { InfoTab } from '@/app/components/ContentCollection/edit/sections/InfoTab';
import { type CollectionUpdateRequest } from '@/app/types/Collection';
import { makeEdit, makeState, makeUpdateData } from '@/tests/fixtures/collectionEditFixtures';

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

describe('InfoTab — cover picker offers the union of own and child images (D3)', () => {
  const ownImage = (id: number) => ({
    id,
    contentType: 'IMAGE' as const,
    orderIndex: id,
    imageUrl: `https://cdn.example/own-${id}.jpg`,
    title: `Own ${id}`,
    locations: [],
  });

  const childRef = (id: number) => ({
    id,
    contentType: 'COLLECTION' as const,
    orderIndex: id,
    slug: `child-${id}`,
    referencedCollectionId: id * 10,
  });

  const childImage = (id: number) => ({
    id,
    contentType: 'IMAGE' as const,
    orderIndex: id,
    imageUrl: `https://cdn.example/child-${id}.jpg`,
    title: `Child ${id}`,
    locations: [],
  });

  function renderPicker() {
    render(
      <InfoTab
        edit={makeEdit({
          isParent: true,
          isSelectingCoverImage: true,
          currentState: makeState({
            content: [ownImage(1), ownImage(2), childRef(90)],
          }),
          childCollectionImages: [childImage(500), ownImage(2)],
        })}
      />
    );
  }

  it("offers the collection's own images even when it also holds a child reference", () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Set Own 1 as cover' })).toBeInTheDocument();
  });

  it("offers the child collection's images too", () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Set Child 500 as cover' })).toBeInTheDocument();
  });

  it('lists an image that is in both pools exactly once', () => {
    renderPicker();
    expect(screen.getAllByRole('button', { name: 'Set Own 2 as cover' })).toHaveLength(1);
  });

  it('never offers a non-image block as a cover candidate', () => {
    renderPicker();
    expect(screen.queryByRole('button', { name: /child-90/ })).not.toBeInTheDocument();
  });
});
