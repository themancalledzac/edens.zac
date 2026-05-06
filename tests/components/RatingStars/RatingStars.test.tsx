import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import RatingStars from '@/app/components/RatingStars/RatingStars';

describe('<RatingStars>', () => {
  it('clicking a star calls onChange with that rating', async () => {
    const onChange = jest.fn().mockResolvedValue(undefined);
    render(<RatingStars initialRating={null} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('radio')[2]!);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
  });

  it('clicking the current rating clears it (null)', async () => {
    const onChange = jest.fn().mockResolvedValue(undefined);
    render(<RatingStars initialRating={4} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('radio')[3]!);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
  });
});
