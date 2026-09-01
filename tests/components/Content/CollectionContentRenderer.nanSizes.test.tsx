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
import { logger } from '@/app/utils/logger';

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
jest.mock('@/app/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
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

/**
 * The NaN guard sits inside a per-tile render, so before it was capped one dimensionless image
 * was a log write per tile, per render, per viewer — and each write said the same thing. That
 * only became expensive once `logger.error` started forwarding to CloudWatch, which is why the
 * cap ships in the same change as the reporting path.
 *
 * Ids here are unique to this block: the cap is module state, and the cases above already
 * render contentId 42 with NaN dimensions.
 */
describe('CollectionContentRenderer — dimension failures are reported once', () => {
  const mockErrorLog = logger.error as jest.MockedFunction<typeof logger.error>;

  beforeEach(() => {
    mockErrorLog.mockClear();
  });

  it('should report a given content id once however often it re-renders', () => {
    const props = { ...imageProps, contentId: 9001 };

    render(<CollectionContentRenderer {...props} width={Number.NaN} height={Number.NaN} />);
    render(<CollectionContentRenderer {...props} width={Number.NaN} height={Number.NaN} />);
    render(<CollectionContentRenderer {...props} width={Number.NaN} height={Number.NaN} />);

    expect(mockErrorLog).toHaveBeenCalledTimes(1);
  });

  it('should still report a different content id', () => {
    render(
      <CollectionContentRenderer
        {...imageProps}
        contentId={9002}
        width={Number.NaN}
        height={Number.NaN}
      />
    );

    expect(mockErrorLog).toHaveBeenCalledTimes(1);
    expect(mockErrorLog.mock.calls.at(0)?.[3]).toMatchObject({ contentId: 9002 });
  });

  it('should not report a tile whose dimensions are finite', () => {
    render(<CollectionContentRenderer {...imageProps} contentId={9003} width={640} height={360} />);

    expect(mockErrorLog).not.toHaveBeenCalled();
  });
});
