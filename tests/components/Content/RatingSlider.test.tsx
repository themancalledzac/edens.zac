/**
 * Tests for RatingSlider — the mobile-first 0-5 overlay slider. Drag fires onDrag (live re-flow),
 * release (pointer up / key up) fires onCommit (persist).
 */

import { fireEvent, render, screen } from '@testing-library/react';

import { RatingSlider } from '@/app/components/Content/RatingSlider';

describe('RatingSlider', () => {
  it('renders a 0-5 integer range input seeded at the current value', () => {
    render(<RatingSlider contentId={9} value={3} onDrag={() => {}} onCommit={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '5');
    expect(slider).toHaveAttribute('step', '1');
    expect((slider as HTMLInputElement).value).toBe('3');
  });

  it('calls onDrag with the parsed int while dragging', () => {
    const onDrag = jest.fn();
    render(<RatingSlider contentId={9} value={3} onDrag={onDrag} onCommit={() => {}} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });
    expect(onDrag).toHaveBeenCalledWith(9, 4);
  });

  it('calls onCommit with the final int on pointer release', () => {
    const onCommit = jest.fn();
    render(<RatingSlider contentId={9} value={3} onDrag={() => {}} onCommit={onCommit} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '5' } });
    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenCalledWith(9, 5);
  });

  it('also commits on keyboard release (keyUp) for accessibility', () => {
    const onCommit = jest.fn();
    render(<RatingSlider contentId={9} value={3} onDrag={() => {}} onCommit={onCommit} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1' } });
    fireEvent.keyUp(slider);
    expect(onCommit).toHaveBeenCalledWith(9, 1);
  });

  it('has an accessible label', () => {
    render(<RatingSlider contentId={9} value={3} onDrag={() => {}} onCommit={() => {}} />);
    expect(screen.getByLabelText(/rating/i)).toBeInTheDocument();
  });
});
