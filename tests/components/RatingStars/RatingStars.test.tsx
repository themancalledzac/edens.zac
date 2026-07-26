import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import RatingStars from '@/app/components/RatingStars/RatingStars';

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

      await waitFor(() => expect(screen.getAllByRole('radio')[4]).toBeEnabled());
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

      await waitFor(() => expect(screen.getAllByRole('radio')[0]).toBeEnabled());
      await new Promise(resolve => setTimeout(resolve, 0));

      process.off('unhandledRejection', unhandled);
      expect(unhandled).not.toHaveBeenCalled();
    });
  });

  describe('pending state', () => {
    it('disables every star while the write is in flight, then re-enables them', async () => {
      let resolveWrite: () => void = () => {};
      const onChange = jest.fn(
        () =>
          new Promise<void>(resolve => {
            resolveWrite = resolve;
          })
      );
      render(<RatingStars initialRating={null} onChange={onChange} />);

      fireEvent.click(screen.getAllByRole('radio')[2]!);

      await waitFor(() => {
        for (const star of screen.getAllByRole('radio')) expect(star).toBeDisabled();
      });

      resolveWrite();

      await waitFor(() => {
        for (const star of screen.getAllByRole('radio')) expect(star).toBeEnabled();
      });
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
