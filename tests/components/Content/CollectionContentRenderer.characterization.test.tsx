/**
 * Characterization tests for {@link CollectionContentRenderer}'s click branches (GIF, placeholder,
 * image, and slug-navigation). These pin the observable behavior driven by the inline
 * `hasClickHandler`/`isSlugNav` derivation BEFORE that logic is extracted into
 * `collectionContentRendererUtils.getClickEligibility`, so the extraction is provably
 * behavior-preserving. They must pass against the un-refactored component unchanged.
 */
import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import CollectionContentRenderer from '@/app/components/Content/CollectionContentRenderer';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/hooks/useParallax', () => ({ useParallax: () => ({ current: null }) }));
jest.mock('@/app/components/ContentCollection/CollectionFilterContext', () => ({
  useCollectionFilter: () => null,
}));

const imageProps = {
  contentId: 7,
  className: 'imageSingle',
  width: 300,
  height: 200,
  isMobile: false,
  imageUrl: 'https://cdn.example/img.jpg',
  imageWidth: 300,
  imageHeight: 200,
  alt: 'a photo',
  enableParallax: false,
  contentType: 'IMAGE' as const,
};

describe('CollectionContentRenderer — image click branch', () => {
  it('fires onImageClick when the image wrapper is clicked', () => {
    const onImageClick = jest.fn();
    const { container } = render(
      <CollectionContentRenderer {...imageProps} onImageClick={onImageClick} />
    );
    const wrapper = container.querySelector('[data-image-wrapper]');
    expect(wrapper).not.toBeNull();
    fireEvent.click(wrapper!.querySelector('div')!);
    expect(onImageClick).toHaveBeenCalledWith(7);
  });

  it('shows a pointer cursor when a click handler exists', () => {
    const { container } = render(
      <CollectionContentRenderer {...imageProps} onImageClick={jest.fn()} />
    );
    const wrapper = container.querySelector('[data-image-wrapper]') as HTMLElement;
    expect(wrapper.style.cursor).toBe('pointer');
  });

  it('shows a default cursor when no click handler exists', () => {
    const { container } = render(<CollectionContentRenderer {...imageProps} />);
    const wrapper = container.querySelector('[data-image-wrapper]') as HTMLElement;
    expect(wrapper.style.cursor).toBe('default');
  });

  it('fires onFullScreenImageClick when fullscreen is enabled and no onImageClick', () => {
    const onFullScreenImageClick = jest.fn();
    const { container } = render(
      <CollectionContentRenderer
        {...imageProps}
        enableFullScreenView
        onFullScreenImageClick={onFullScreenImageClick}
      />
    );
    const wrapper = container.querySelector('[data-image-wrapper]')!;
    fireEvent.click(wrapper.querySelector('div')!);
    expect(onFullScreenImageClick).toHaveBeenCalledTimes(1);
    expect(onFullScreenImageClick.mock.calls[0][0]).toMatchObject({ id: 7, contentType: 'IMAGE' });
  });
});

describe('CollectionContentRenderer — slug navigation branch', () => {
  it('renders a navigation link (no onImageClick) and does not fire a click handler', () => {
    render(
      <CollectionContentRenderer
        {...imageProps}
        contentType="COLLECTION"
        isCollection
        hasSlug="dolomites-2025"
        overlayText="Dolomites"
      />
    );
    const link = screen.getByRole('link', { name: 'Dolomites' });
    expect(link).toHaveAttribute('href', '/dolomites-2025');
  });

  it('does NOT navigate via href when onImageClick is supplied (handler wins)', () => {
    const onImageClick = jest.fn();
    const { container } = render(
      <CollectionContentRenderer
        {...imageProps}
        contentType="COLLECTION"
        isCollection
        hasSlug="dolomites-2025"
        onImageClick={onImageClick}
      />
    );
    // With onImageClick present, isSlugNav is false → wrapper div, not a Tile/link.
    expect(container.querySelector('a[href="/dolomites-2025"]')).toBeNull();
    const wrapper = container.querySelector('[data-image-wrapper]')!;
    fireEvent.click(wrapper.querySelector('div')!);
    expect(onImageClick).toHaveBeenCalledWith(7);
  });
});

describe('CollectionContentRenderer — GIF branch', () => {
  const gifProps = {
    ...imageProps,
    contentId: 11,
    contentType: 'GIF' as const,
    imageUrl: 'https://cdn.example/clip.mp4',
    isGif: true,
  };

  it('renders a video source and fires onImageClick on click', () => {
    const onImageClick = jest.fn();
    const { container } = render(
      <CollectionContentRenderer {...gifProps} onImageClick={onImageClick} />
    );
    const source = container.querySelector('source');
    expect(source).toHaveAttribute('src', 'https://cdn.example/clip.mp4');
    fireEvent.click(container.querySelector('video')!.parentElement!);
    expect(onImageClick).toHaveBeenCalledWith(11);
  });

  it('uses a pointer cursor on the GIF container when a click handler exists', () => {
    const { container } = render(
      <CollectionContentRenderer {...gifProps} onImageClick={jest.fn()} />
    );
    const box = container.querySelector('video')!.closest('div')!.parentElement as HTMLElement;
    expect(box.style.cursor).toBe('pointer');
  });
});

describe('CollectionContentRenderer — placeholder branch (no valid image)', () => {
  const placeholderProps = {
    ...imageProps,
    contentId: 21,
    imageUrl: '',
    overlayText: 'Untitled',
  };

  it('renders overlay text and is a button when a click handler exists', () => {
    const onImageClick = jest.fn();
    render(<CollectionContentRenderer {...placeholderProps} onImageClick={onImageClick} />);
    const button = screen.getByRole('button', { name: 'Untitled' });
    fireEvent.click(button);
    expect(onImageClick).toHaveBeenCalledWith(21);
  });

  it('fires the click handler on Enter/Space keydown', () => {
    const onImageClick = jest.fn();
    render(<CollectionContentRenderer {...placeholderProps} onImageClick={onImageClick} />);
    const button = screen.getByRole('button', { name: 'Untitled' });
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onImageClick).toHaveBeenCalledWith(21);
  });

  it('is not a button when no click handler exists', () => {
    render(<CollectionContentRenderer {...placeholderProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});

describe('CollectionContentRenderer — reorder mode disables click handling', () => {
  it('does not fire onImageClick while in reorder mode', () => {
    const onImageClick = jest.fn();
    const { container } = render(
      <CollectionContentRenderer {...imageProps} onImageClick={onImageClick} isReorderMode />
    );
    const wrapper = container.querySelector('[data-image-wrapper]')!;
    fireEvent.click(wrapper.querySelector('div')!);
    expect(onImageClick).not.toHaveBeenCalled();
  });
});
