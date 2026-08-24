/**
 * Tests for DownloadIcon — the download glyph extracted from ClientGalleryDownload and
 * FullScreenDownloadButton, which previously carried byte-identical copies of the same SVG.
 *
 * The geometry assertions are deliberately exact. The whole point of the extraction is that both
 * call sites keep rendering the same glyph, so a change to the path data must fail here rather than
 * silently altering two screens at once.
 *
 * The sizing assertions cover the one real difference between the two old copies: they used
 * different classes (`.downloadIcon` at 18px, `.icon` at 20px), so the shared component must take
 * `className` and must NOT bake in width/height.
 */

import { render } from '@testing-library/react';

import DownloadIcon from '@/app/components/Icons/DownloadIcon';

const renderIcon = (props: Record<string, unknown> = {}) => {
  const { container } = render(<DownloadIcon {...props} />);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('DownloadIcon did not render an <svg>');
  return svg;
};

describe('DownloadIcon', () => {
  it('renders the tray-with-down-arrow geometry', () => {
    const svg = renderIcon();

    expect(svg.querySelector('path')).toHaveAttribute(
      'd',
      'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'
    );
    expect(svg.querySelector('polyline')).toHaveAttribute('points', '7 10 12 15 17 10');

    const line = svg.querySelector('line');
    expect(line).toHaveAttribute('x1', '12');
    expect(line).toHaveAttribute('y1', '15');
    expect(line).toHaveAttribute('x2', '12');
    expect(line).toHaveAttribute('y2', '3');
  });

  it('renders the stroke presentation both call sites relied on', () => {
    const svg = renderIcon();

    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
  });

  it('is hidden from assistive tech by default, because the wrapping control carries the name', () => {
    expect(renderIcon()).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets no intrinsic size, so each call site sizes the glyph from its own SCSS module', () => {
    const svg = renderIcon();

    expect(svg).not.toHaveAttribute('width');
    expect(svg).not.toHaveAttribute('height');
  });

  it('forwards className, which is the only thing that differed between the two old copies', () => {
    expect(renderIcon({ className: 'downloadIcon' })).toHaveClass('downloadIcon');
    expect(renderIcon({ className: 'icon' })).toHaveClass('icon');
  });

  it('lets a caller override aria-hidden through the spread', () => {
    expect(renderIcon({ 'aria-hidden': false })).toHaveAttribute('aria-hidden', 'false');
  });
});
