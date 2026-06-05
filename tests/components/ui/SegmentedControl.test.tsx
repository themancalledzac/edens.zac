import { fireEvent, render, screen } from '@testing-library/react';

import { SegmentedControl } from '@/app/components/ui/SegmentedControl/SegmentedControl';

type Vis = 'LISTED' | 'UNLISTED' | 'HIDDEN';

const OPTIONS = [
  { value: 'LISTED' as Vis, label: 'Listed', description: 'Shown everywhere.' },
  { value: 'UNLISTED' as Vis, label: 'Unlisted', description: 'Link only.' },
  { value: 'HIDDEN' as Vis, label: 'Hidden', description: 'Admin only.' },
];

describe('SegmentedControl', () => {
  it('renders one radio per option inside a labelled radiogroup', () => {
    render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="LISTED"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('radiogroup', { name: 'Visibility' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks only the selected option as checked', () => {
    render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="UNLISTED"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('radio', { name: 'Unlisted' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Listed' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked option value', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="LISTED"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Hidden' }));
    expect(onChange).toHaveBeenCalledWith('HIDDEN');
  });

  it('uses a roving tabindex — only the selected radio is in the tab order', () => {
    render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="UNLISTED"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('radio', { name: 'Listed' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Unlisted' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Hidden' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves selection to the next option on ArrowRight (and wraps)', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="HIDDEN"
        onChange={onChange}
      />
    );

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Hidden' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('LISTED'); // wraps from last to first
  });

  it('moves selection to the previous option on ArrowLeft (and wraps)', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="LISTED"
        onChange={onChange}
      />
    );

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Listed' }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('HIDDEN'); // wraps from first to last
  });

  it('jumps to first/last with Home/End', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="UNLISTED"
        onChange={onChange}
      />
    );

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Unlisted' }), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('HIDDEN');

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Unlisted' }), { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('LISTED');
  });

  it('shows the selected option description only when showDescription is set', () => {
    const { rerender } = render(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="HIDDEN"
        onChange={() => {}}
      />
    );
    expect(screen.queryByText('Admin only.')).not.toBeInTheDocument();

    rerender(
      <SegmentedControl<Vis>
        ariaLabel="Visibility"
        options={OPTIONS}
        value="HIDDEN"
        onChange={() => {}}
        showDescription
      />
    );
    expect(screen.getByText('Admin only.')).toBeInTheDocument();
  });
});
