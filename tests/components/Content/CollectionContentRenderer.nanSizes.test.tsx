/**
 * Guards C5's first bullet. `imageProps` was built before the NaN recovery ran, so the `sizes`
 * template interpolated the raw `width`. A NaN width produced the literal attribute
 * `"(max-width: 768px) 100vw, NaNpx"`, which is not a valid media condition — the browser discards
 * it and falls back to picking the largest candidate in the srcset.
 *
 * The recovery (`resolveValidDimensions`) is now hoisted above `imageProps` and `sizes` uses
 * `validWidth`. Nothing else in the render path reads the raw width, so this attribute is the whole
 * observable surface of that bug.
 */

import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import CollectionContentRenderer from '@/app/components/Content/CollectionContentRenderer';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/hooks/useParallax', () => ({ useParallax: () => ({ current: null }) }));
jest.mock('@/app/components/ContentCollection/CollectionFilterContext', () => ({
  useCollectionFilter: () => null,
}));
jest.mock('@/app/components/ui/FilterToolbar/FilterToolbar', () => ({
  FilterToolbar: () => null,
}));
jest.mock('@/app/components/auth/MeProvider', () => ({
  useMe: jest.fn(() => null),
}));

const imageProps = {
  contentId: 42,
  className: 'imageSingle',
  isMobile: false,
  imageUrl: 'https://d2qp8h5pbkohe6.cloudfront.net/example.jpg',
  imageWidth: 1920,
  imageHeight: 1080,
  alt: 'example',
  enableParallax: false,
  contentType: 'IMAGE' as const,
};

describe('CollectionContentRenderer — sizes attribute with NaN dimensions', () => {
  it('should not emit NaNpx when width is NaN', () => {
    render(<CollectionContentRenderer {...imageProps} width={Number.NaN} height={400} />);

    const sizes = screen.getByRole('img').getAttribute('sizes');

    expect(sizes).not.toBeNull();
    expect(sizes).not.toContain('NaN');
  });

  it('should not emit NaNpx when both dimensions are NaN', () => {
    render(<CollectionContentRenderer {...imageProps} width={Number.NaN} height={Number.NaN} />);

    expect(screen.getByRole('img').getAttribute('sizes')).not.toContain('NaN');
  });

  /**
   * Pins the recovered value, not just the absence of the string. width NaN against a 1920x1080
   * image and a finite height of 400 recovers to 400 * 1920 / 1080 = 711.11, rounded to 711.
   */
  it('should size from the recovered width, not a placeholder', () => {
    render(<CollectionContentRenderer {...imageProps} width={Number.NaN} height={400} />);

    expect(screen.getByRole('img').getAttribute('sizes')).toBe('(max-width: 768px) 100vw, 711px');
  });

  it('should leave a finite width untouched', () => {
    render(<CollectionContentRenderer {...imageProps} width={640} height={360} />);

    expect(screen.getByRole('img').getAttribute('sizes')).toBe('(max-width: 768px) 100vw, 640px');
  });
});
