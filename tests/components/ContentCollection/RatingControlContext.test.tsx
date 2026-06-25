/**
 * Tests for RatingControlContext — the provider/hook bridging CollectionPageClient's override
 * state to the deeply-rendered RatingSlider, without prop-drilling.
 */

import { render, screen } from '@testing-library/react';

import {
  type RatingControlContextValue,
  RatingControlProvider,
  useRatingControl,
} from '@/app/components/ContentCollection/RatingControlContext';

function makeValue(overrides?: Partial<RatingControlContextValue>): RatingControlContextValue {
  return {
    canEdit: false,
    resolveRatingForImage: () => 0,
    onDrag: () => {},
    onCommit: () => {},
    ...overrides,
  };
}

function Probe() {
  const ctx = useRatingControl();
  return <span>{ctx ? `editable:${ctx.canEdit}` : 'none'}</span>;
}

describe('RatingControlContext', () => {
  it('provides the value to consumers wrapped in the provider', () => {
    render(
      <RatingControlProvider value={makeValue({ canEdit: true })}>
        <Probe />
      </RatingControlProvider>
    );
    expect(screen.getByText('editable:true')).toBeInTheDocument();
  });

  it('returns null outside a provider', () => {
    render(<Probe />);
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});
