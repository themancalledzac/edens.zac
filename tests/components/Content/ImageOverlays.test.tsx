/**
 * Tests for ImageOverlays — the presentational overlay container. It renders the pre-built `star`
 * (Selects) node for IMAGE content, and nothing for non-IMAGE.
 */

import { render, screen } from '@testing-library/react';

import { ImageOverlays } from '@/app/components/Content/ImageOverlays';

const baseProps = {
  isNotVisible: false,
  shouldShowOverlay: false,
  isSelected: false,
};

describe('ImageOverlays', () => {
  it('renders the pre-built star for IMAGE content', () => {
    render(<ImageOverlays contentType="IMAGE" {...baseProps} star={<span>STAR</span>} />);
    expect(screen.getByText('STAR')).toBeInTheDocument();
  });

  it('renders nothing for non-IMAGE content even when overlays are passed', () => {
    const { container } = render(
      <ImageOverlays contentType="TEXT" {...baseProps} star={<span>STAR</span>} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
