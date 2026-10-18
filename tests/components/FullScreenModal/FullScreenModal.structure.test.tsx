/**
 * Semantic structure of the fullscreen metadata panel and position counter: section headers are
 * headings, each section's items are a list, and the counter is not a live region announced on
 * every swipe.
 */
import { render, screen, within } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { ContentImageModel } from '@/app/types/Content';

jest.mock('@/app/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: jest.fn() }));

const img = (id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  ({
    id,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example/${id}.jpg`,
    imageWidth: 1000,
    imageHeight: 800,
    orderIndex: id,
    visible: true,
    title: `Image ${id}`,
    locations: [],
    ...overrides,
  }) as ContentImageModel;

const noop = () => {};

function renderModal(images: ContentImageModel[]) {
  return render(
    <FullScreenModal
      fullScreenState={{ images, currentIndex: 0 }}
      loadedImageIds={new Set<number>(images.map(i => i.id))}
      setLoadedImageIds={noop}
      modalRef={{ current: null }}
      zoomTargetRef={{ current: null }}
      isZoomed={false}
      hideImage={noop}
      isSwiping={{ current: false }}
      showMetadata
      toggleMetadata={noop}
      navigateToNext={noop}
      navigateToPrevious={noop}
    />
  );
}

describe('FullScreenModal — metadata structure', () => {
  const tagged = () =>
    img(1, {
      tags: [
        { id: 1, name: 'alpine', slug: 'alpine' },
        { id: 2, name: 'plain' } as NonNullable<ContentImageModel['tags']>[number],
      ],
      people: [{ id: 3, name: 'Nate' }],
    });

  it('renders section headers as h2 headings', () => {
    renderModal([tagged()]);
    expect(screen.getByRole('heading', { level: 2, name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'People' })).toBeInTheDocument();
  });

  it('renders each section as a list of items, linked or not', () => {
    renderModal([tagged()]);
    const lists = screen.getAllByRole('list');
    const tagList = lists.find(list => within(list).queryByText('alpine'));
    expect(tagList).toBeDefined();
    expect(within(tagList as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(tagList as HTMLElement).getByRole('link', { name: 'alpine' })
    ).toBeInTheDocument();
  });
});

describe('FullScreenModal — position counter', () => {
  it('is not an aria-live region', () => {
    renderModal([img(1), img(2)]);
    const counter = screen.getByText('1 / 2');
    expect(counter).not.toHaveAttribute('aria-live');
    expect(counter.closest('[aria-live]')).toBeNull();
  });
});
