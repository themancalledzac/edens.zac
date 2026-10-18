/**
 * Pins that `EditModeLayer` does no content-block layout work while reorder mode is active.
 * Reorder renders `edit.displayContent`, so `processContentBlocks` and `applySort` output would be
 * computed and thrown away on every render.
 */
import '@testing-library/jest-dom';

import { act, render } from '@testing-library/react';

import EditModeLayer from '@/app/components/ContentCollection/edit/EditModeLayer';
import { INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import type * as ContentLayout from '@/app/utils/contentLayout';
import type * as SortContent from '@/app/utils/sortContent';
import { makeCollection, makeEdit } from '@/tests/fixtures/collectionEditFixtures';

const mockProcessContentBlocks = jest.fn();
const mockApplySort = jest.fn();

jest.mock('@/app/utils/contentLayout', () => {
  const actual = jest.requireActual<typeof ContentLayout>('@/app/utils/contentLayout');
  return {
    ...actual,
    processContentBlocks: (...args: Parameters<typeof actual.processContentBlocks>) => {
      mockProcessContentBlocks(...args);
      return actual.processContentBlocks(...args);
    },
  };
});

jest.mock('@/app/utils/sortContent', () => {
  const actual = jest.requireActual<typeof SortContent>('@/app/utils/sortContent');
  return {
    ...actual,
    applySort: (...args: Parameters<typeof actual.applySort>) => {
      mockApplySort(...args);
      return actual.applySort(...args);
    },
  };
});

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="grid" />,
}));
jest.mock('@/app/components/Metadata/MetadataModal', () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock('@/app/components/TextBlockCreateModal/TextBlockCreateModal', () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock('@/app/lib/api/roles', () => ({
  listCollectionRoles: jest.fn(() => Promise.resolve([])),
  listRoles: jest.fn(() => Promise.resolve([])),
  grantRoleAccess: jest.fn(() => Promise.resolve()),
  revokeRoleAccess: jest.fn(() => Promise.resolve()),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/smith-wedding',
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseCollectionEdit = jest.fn();
jest.mock('@/app/components/ContentCollection/edit/useCollectionEdit', () => ({
  useCollectionEdit: (...args: unknown[]) => mockUseCollectionEdit(...args),
}));

async function renderLayer() {
  await act(async () => {
    render(
      <EditModeLayer
        collection={makeCollection({ id: 42, slug: 'smith-wedding' })}
        filterState={INITIAL_FILTER_STATE}
        setFilterState={jest.fn()}
        syncToUrl={jest.fn()}
        onMounted={jest.fn()}
      />
    );
  });
}

describe('EditModeLayer layout work', () => {
  beforeEach(() => {
    mockProcessContentBlocks.mockClear();
    mockApplySort.mockClear();
  });

  it('skips processContentBlocks and applySort while reorder is active', async () => {
    const base = makeEdit({});
    mockUseCollectionEdit.mockReturnValue({
      ...base,
      reorder: { ...base.reorder, active: true },
    });
    await renderLayer();
    expect(mockProcessContentBlocks).not.toHaveBeenCalled();
    expect(mockApplySort).not.toHaveBeenCalled();
  });

  it('runs processContentBlocks and applySort outside reorder mode', async () => {
    mockUseCollectionEdit.mockReturnValue(makeEdit({}));
    await renderLayer();
    expect(mockProcessContentBlocks).toHaveBeenCalled();
    expect(mockApplySort).toHaveBeenCalled();
  });
});
