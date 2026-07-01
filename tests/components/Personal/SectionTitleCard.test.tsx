import { fireEvent, render, screen } from '@testing-library/react';

import { SectionTitleCard } from '@/app/components/Personal/SectionTitleCard';

describe('SectionTitleCard', () => {
  it('renders the label and item count', () => {
    render(
      <SectionTitleCard
        label="Saved"
        count={12}
        open={false}
        onToggle={jest.fn()}
        controlsId="body-1"
      />
    );
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('reflects the open state via aria-expanded', () => {
    const { rerender } = render(
      <SectionTitleCard
        label="Images"
        count={3}
        open={false}
        onToggle={jest.fn()}
        controlsId="body-2"
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'body-2');

    rerender(
      <SectionTitleCard label="Images" count={3} open onToggle={jest.fn()} controlsId="body-2" />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onToggle when clicked', () => {
    const onToggle = jest.fn();
    render(
      <SectionTitleCard
        label="Following"
        count={0}
        open={false}
        onToggle={onToggle}
        controlsId="body-3"
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
