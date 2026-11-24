/**
 * Tests for ImageOverlays — the presentational overlay container. It renders the pre-built `star`
 * (Selects) and `save` nodes for IMAGE content inside the `tileToggles` wrapper that touch screens
 * hide, and nothing for non-IMAGE.
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

  it('wraps the star and heart in the tile toggles container', () => {
    render(
      <ImageOverlays
        contentType="IMAGE"
        {...baseProps}
        star={<span>STAR</span>}
        save={<span>SAVE</span>}
      />
    );
    const wrapper = screen.getByText('STAR').parentElement;
    expect(wrapper).toHaveClass('tileToggles');
    expect(wrapper).toContainElement(screen.getByText('SAVE'));
  });

  it('renders no tile toggles container when neither is passed', () => {
    const { container } = render(<ImageOverlays contentType="IMAGE" {...baseProps} />);
    expect(container.querySelector('.tileToggles')).toBeNull();
  });
});
