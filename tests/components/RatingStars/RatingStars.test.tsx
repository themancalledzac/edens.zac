import '@testing-library/jest-dom';

import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RatingStars from '@/app/components/RatingStars/RatingStars';

/**
 * An `onChange` that parks in the pending state until `settle()` is called, so a test can
 * inspect the control mid-write.
 */
function deferredWrite() {
  let resolveWrite: () => void = () => {};
  const onChange = jest.fn(
    () =>
      new Promise<void>(resolve => {
        resolveWrite = resolve;
      })
  );
  return { onChange, settle: () => resolveWrite() };
}

describe('<RatingStars>', () => {
  it('clicking a star calls onChange with that rating', async () => {
    const onChange = jest.fn().mockResolvedValue(void 0);
    render(<RatingStars initialRating={null} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('radio')[2]!);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
  });

  it('clicking the current rating clears it (null)', async () => {
    const onChange = jest.fn().mockResolvedValue(void 0);
    render(<RatingStars initialRating={4} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('radio')[3]!);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
  });

  it('commits the new rating optimistically once onChange resolves', async () => {
    const onChange = jest.fn().mockResolvedValue(void 0);
    render(<RatingStars initialRating={null} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('radio')[2]!);
    await waitFor(() => expect(screen.getAllByRole('radio')[2]).toBeChecked());
  });

  describe('failure path', () => {
    it('keeps the previous rating when onChange rejects', async () => {
      const onChange = jest.fn().mockRejectedValue(new Error('401'));
      render(<RatingStars initialRating={2} onChange={onChange} />);

      fireEvent.click(screen.getAllByRole('radio')[4]!);

      await waitFor(() =>
        expect(screen.getAllByRole('radio')[4]).not.toHaveAttribute('aria-disabled')
      );
      expect(screen.getAllByRole('radio')[1]).toBeChecked();
      expect(screen.getAllByRole('radio')[4]).not.toBeChecked();
    });

    it('does not leave an unhandled rejection when onChange rejects', async () => {
      // The caller surfaces the failure and rethrows; RatingStars must swallow it, because
      // the click handler discards the promise.
      const unhandled = jest.fn();
      process.on('unhandledRejection', unhandled);

      const onChange = jest.fn().mockRejectedValue(new Error('network'));
      render(<RatingStars initialRating={null} onChange={onChange} />);
      fireEvent.click(screen.getAllByRole('radio')[0]!);

      await waitFor(() =>
        expect(screen.getAllByRole('radio')[0]).not.toHaveAttribute('aria-disabled')
      );
      await new Promise(resolve => setTimeout(resolve, 0));

      process.off('unhandledRejection', unhandled);
      expect(unhandled).not.toHaveBeenCalled();
    });
  });

  describe('pending state', () => {
    it('marks every star aria-disabled while the write is in flight, then clears it', async () => {
      const { onChange, settle } = deferredWrite();
      render(<RatingStars initialRating={null} onChange={onChange} />);

      fireEvent.click(screen.getAllByRole('radio')[2]!);

      await waitFor(() => {
        for (const star of screen.getAllByRole('radio'))
          expect(star).toHaveAttribute('aria-disabled', 'true');
      });

      settle();

      await waitFor(() => {
        for (const star of screen.getAllByRole('radio'))
          expect(star).not.toHaveAttribute('aria-disabled');
      });
    });

    it('never sets the real disabled attribute, so the browser cannot drop focus mid-write', async () => {
      const { onChange, settle } = deferredWrite();
      render(<RatingStars initialRating={null} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[2]!.focus();

      fireEvent.click(stars[2]!);

      await waitFor(() => expect(stars[2]).toHaveAttribute('aria-disabled', 'true'));
      for (const star of stars) expect(star).toBeEnabled();
      expect(stars[2]).toHaveAttribute('tabindex', '0');
      expect(stars[2]).toHaveFocus();

      settle();
      await waitFor(() => expect(stars[2]).not.toHaveAttribute('aria-disabled'));
      expect(stars[2]).toHaveFocus();
    });

    it('ignores a click while a write is in flight instead of double-submitting', async () => {
      const { onChange, settle } = deferredWrite();
      render(<RatingStars initialRating={null} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');

      fireEvent.click(stars[2]!);
      await waitFor(() => expect(stars[2]).toHaveAttribute('aria-disabled', 'true'));

      fireEvent.click(stars[4]!);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(stars[4]).not.toBeChecked();

      settle();
      await waitFor(() => expect(stars[2]).toBeChecked());
      expect(stars[4]).not.toBeChecked();
    });

    it('swallows arrow keys while a write is in flight so the page cannot scroll', async () => {
      const { onChange, settle } = deferredWrite();
      render(<RatingStars initialRating={1} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[0]!.focus();

      fireEvent.keyDown(stars[0]!, { key: 'ArrowRight' });
      await waitFor(() => expect(stars[1]).toHaveAttribute('aria-disabled', 'true'));

      const arrowDown = createEvent.keyDown(stars[1]!, { key: 'ArrowDown' });
      fireEvent(stars[1]!, arrowDown);

      expect(arrowDown.defaultPrevented).toBe(true);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(stars[1]).toHaveFocus();

      settle();
      await waitFor(() => expect(stars[1]).toBeChecked());
    });
  });

  describe('accessible names', () => {
    it('pluralizes the star count', () => {
      render(<RatingStars initialRating={null} onChange={jest.fn()} />);
      expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '2 stars' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '5 stars' })).toBeInTheDocument();
    });
  });

  describe('roving tabindex', () => {
    it('exposes exactly one tab stop, on the checked star', () => {
      render(<RatingStars initialRating={3} onChange={jest.fn()} />);
      const stars = screen.getAllByRole('radio');
      expect(stars.filter(s => s.getAttribute('tabindex') === '0')).toHaveLength(1);
      expect(stars[2]).toHaveAttribute('tabindex', '0');
    });

    it('parks the tab stop on the first star when nothing is checked', () => {
      render(<RatingStars initialRating={null} onChange={jest.fn()} />);
      const stars = screen.getAllByRole('radio');
      expect(stars.filter(s => s.getAttribute('tabindex') === '0')).toHaveLength(1);
      expect(stars[0]).toHaveAttribute('tabindex', '0');
    });

    it('moves the tab stop with the selection', async () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={null} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');

      fireEvent.click(stars[3]!);

      await waitFor(() => expect(stars[3]).toBeChecked());
      expect(stars[3]).toHaveAttribute('tabindex', '0');
      expect(stars[0]).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowRight moves focus to the next star and selects it', async () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={2} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[1]!.focus();

      fireEvent.keyDown(stars[1]!, { key: 'ArrowRight' });

      expect(stars[2]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
      await waitFor(() => expect(stars[2]).toBeChecked());
    });

    it('ArrowDown behaves like ArrowRight', async () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={1} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[0]!.focus();

      fireEvent.keyDown(stars[0]!, { key: 'ArrowDown' });

      expect(stars[1]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(2));
    });

    it('ArrowLeft moves focus to the previous star and selects it', async () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={4} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[3]!.focus();

      fireEvent.keyDown(stars[3]!, { key: 'ArrowLeft' });

      expect(stars[2]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
    });

    it('ArrowUp behaves like ArrowLeft', async () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={4} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[3]!.focus();

      fireEvent.keyDown(stars[3]!, { key: 'ArrowUp' });

      expect(stars[2]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
    });

    it('wraps from the last star to the first and back', async () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={5} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[4]!.focus();

      fireEvent.keyDown(stars[4]!, { key: 'ArrowRight' });

      expect(stars[0]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(1));
      await waitFor(() => expect(stars[0]).toBeChecked());

      fireEvent.keyDown(stars[0]!, { key: 'ArrowLeft' });

      expect(stars[4]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(5));
    });

    it('Home selects the first star and End the last', async () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={3} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[2]!.focus();

      fireEvent.keyDown(stars[2]!, { key: 'End' });

      expect(stars[4]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(5));
      await waitFor(() => expect(stars[4]).toBeChecked());

      fireEvent.keyDown(stars[4]!, { key: 'Home' });

      expect(stars[0]).toHaveFocus();
      await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(1));
      await waitFor(() => expect(stars[0]).toBeChecked());
    });

    it('holds focus on the star it moved to, so the next arrow press lands on the group', async () => {
      // Both presses are dispatched at `document.activeElement` rather than a captured node, so
      // the test only passes while focus really is where the component claims to have put it.
      // Losing focus to the document makes the second press miss the component entirely.
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={1} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[0]!.focus();

      fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      await waitFor(() => expect(stars[1]).toBeChecked());
      expect(document.activeElement).toBe(stars[1]);

      fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
      await waitFor(() => expect(stars[2]).toBeChecked());
      expect(document.activeElement).toBe(stars[2]);
      expect(onChange).toHaveBeenNthCalledWith(2, 3);
    });

    it('never clears the rating: Home on an already-first selection issues no write', () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={1} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[0]!.focus();

      fireEvent.keyDown(stars[0]!, { key: 'Home' });

      expect(onChange).not.toHaveBeenCalled();
      expect(stars[0]).toBeChecked();
      expect(stars[0]).toHaveFocus();
    });

    it('ignores keys it does not own', () => {
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={2} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[1]!.focus();

      fireEvent.keyDown(stars[1]!, { key: 'a' });

      expect(onChange).not.toHaveBeenCalled();
      expect(stars[1]).toHaveFocus();
    });
  });

  describe('Space and Enter', () => {
    it('Space activates the focused star and commits it', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={null} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[2]!.focus();

      await user.keyboard('[Space]');

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
      await waitFor(() => expect(stars[2]).toBeChecked());
    });

    it('Enter activates the focused star and commits it', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={null} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[3]!.focus();

      await user.keyboard('[Enter]');

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(4));
      await waitFor(() => expect(stars[3]).toBeChecked());
    });

    it('keeps focus on the activated star, so a second Space still reaches it', async () => {
      // `user.keyboard` types at `document.activeElement`. If the write stole focus, the second
      // press would land on the document and the toggle-off would never be issued.
      const user = userEvent.setup();
      const onChange = jest.fn(() => Promise.resolve());
      render(<RatingStars initialRating={null} onChange={onChange} />);
      const stars = screen.getAllByRole('radio');
      stars[2]!.focus();

      await user.keyboard('[Space]');
      await waitFor(() => expect(stars[2]).toBeChecked());
      expect(document.activeElement).toBe(stars[2]);

      await user.keyboard('[Space]');
      await waitFor(() => expect(stars[2]).not.toBeChecked());
      expect(document.activeElement).toBe(stars[2]);
      expect(onChange).toHaveBeenNthCalledWith(2, null);
    });
  });

  describe('initialRating re-sync', () => {
    it('adopts an initialRating that arrives after mount', () => {
      // The admin metadata fetch resolves after the control renders. Without the re-sync a
      // rated collection shows empty stars all session, inviting a silent overwrite.
      const onChange = jest.fn();
      const { rerender } = render(<RatingStars initialRating={null} onChange={onChange} />);
      expect(screen.getAllByRole('radio')[3]).not.toBeChecked();

      rerender(<RatingStars initialRating={4} onChange={onChange} />);

      expect(screen.getAllByRole('radio')[3]).toBeChecked();
    });
  });
});
