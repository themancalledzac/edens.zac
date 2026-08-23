/**
 * Regression tests for the gray `visibilityOverlay` tint on the manage grid.
 *
 * These render `BoxRenderer` with the REAL `CollectionContentRenderer` (no module mock) on purpose.
 * The tint broke because `BoxRenderer` flattens the content block into primitives before handing it
 * to the renderer, and the renderer was deriving visibility from a stubbed block that hardcoded
 * `visible: true` — so it never painted. A test against either component alone would have passed.
 */

import '@testing-library/jest-dom';

import { render } from '@testing-library/react';

import { BoxRenderer } from '@/app/components/Content/BoxRenderer';
import type { ChildCollection } from '@/app/types/Collection';
import type { ContentImageModel } from '@/app/types/Content';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/hooks/useParallax', () => ({ useParallax: () => ({ current: null }) }));
jest.mock('@/app/components/ContentCollection/CollectionFilterContext', () => ({
  useCollectionFilter: () => null,
}));

const COLLECTION_ID = 42;

const childCollection = (overrides?: Partial<ChildCollection>): ChildCollection => ({
  collectionId: COLLECTION_ID,
  name: 'Managed collection',
  visible: true,
  orderIndex: 0,
  ...overrides,
});

const renderLeaf = (content: ContentImageModel, currentCollectionId?: number) => {
  const sizes = new Map([[content.id, { width: 400, height: 300 }]]);
  return render(
    <BoxRenderer
      tree={{ type: 'leaf', content }}
      sizes={sizes}
      isMobile={false}
      currentCollectionId={currentCollectionId}
    />
  );
};

const overlay = (container: HTMLElement) => container.querySelector('.visibilityOverlay');

describe('BoxRenderer — visibility overlay on the manage grid', () => {
  it('paints the overlay for a block hidden in the collection being managed', () => {
    const image = createImageContent(1, {
      collections: [childCollection({ visible: false })],
    });
    const { container } = renderLeaf(image, COLLECTION_ID);
    expect(overlay(container)).toBeInTheDocument();
  });

  it('paints the overlay for a globally hidden block', () => {
    const image = createImageContent(2, { visible: false });
    const { container } = renderLeaf(image, COLLECTION_ID);
    expect(overlay(container)).toBeInTheDocument();
  });

  it('leaves a visible block untinted', () => {
    const image = createImageContent(3, { collections: [childCollection()] });
    const { container } = renderLeaf(image, COLLECTION_ID);
    expect(overlay(container)).not.toBeInTheDocument();
  });

  it('ignores a hidden entry for some other collection', () => {
    const image = createImageContent(4, {
      collections: [childCollection({ collectionId: 99, visible: false })],
    });
    const { container } = renderLeaf(image, COLLECTION_ID);
    expect(overlay(container)).not.toBeInTheDocument();
  });

  it('never paints on the public view, where no collection is being managed', () => {
    const image = createImageContent(5, { visible: false });
    const { container } = renderLeaf(image);
    expect(overlay(container)).not.toBeInTheDocument();
  });
});
