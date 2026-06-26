/**
 * Tests for RatingSliderGate — the self-gating wrapper that renders RatingSlider only when a
 * RatingControlProvider is mounted and the viewer may edit. Mirrors the SelectStar gating tests.
 */

import { render, screen } from '@testing-library/react';

import { RatingSliderGate } from '@/app/components/Content/RatingSliderGate';
import {
  type RatingControlContextValue,
  RatingControlProvider,
} from '@/app/components/ContentCollection/RatingControlContext';

function makeValue(overrides?: Partial<RatingControlContextValue>): RatingControlContextValue {
  return {
    canEdit: true,
    resolveRatingForImage: () => 3,
    onDrag: () => {},
    onCommit: () => {},
    ...overrides,
  };
}

describe('RatingSliderGate', () => {
  it('renders nothing with no provider (public / anonymous view)', () => {
    const { container } = render(<RatingSliderGate contentId={9} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the viewer may not edit', () => {
    const { container } = render(
      <RatingControlProvider value={makeValue({ canEdit: false })}>
        <RatingSliderGate contentId={9} />
      </RatingControlProvider>
    );
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it('renders the slider, seeded at the resolved value, when the viewer may edit', () => {
    render(
      <RatingControlProvider value={makeValue({ canEdit: true, resolveRatingForImage: () => 4 })}>
        <RatingSliderGate contentId={9} />
      </RatingControlProvider>
    );
    const slider = screen.getByRole('slider');
    expect((slider as HTMLInputElement).value).toBe('4');
  });
});
