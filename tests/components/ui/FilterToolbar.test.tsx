import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';

import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';

type Props = ComponentProps<typeof FilterToolbar>;

function renderToolbar(overrides: Partial<Props> = {}) {
  const onFilterChange = jest.fn();
  const onDensityChange = jest.fn();
  const props: Props = {
    filterState: INITIAL_FILTER_STATE,
    onFilterChange,
    dimensions: {},
    showDateSort: false,
    showHighlyRated: false,
    showFilm: false,
    ...overrides,
  };
  render(<FilterToolbar {...props} />);
  return { onFilterChange, onDensityChange };
}

describe('FilterToolbar', () => {
  it('renders a date-sort toggle that cycles off -> asc on click', () => {
    const { onFilterChange } = renderToolbar({ showDateSort: true });
    fireEvent.click(screen.getByRole('button', { name: /date/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'asc' });
  });

  it('two-state date toggle cycles asc <-> desc and never shows the off label', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' },
    });
    // Shows the directional label, not the neutral "Date".
    const chip = screen.getByRole('button', { name: /date ↑/i });
    expect(screen.queryByRole('button', { name: /^date$/i })).toBeNull();
    fireEvent.click(chip);
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'desc' });
  });

  it('two-state date toggle from desc cycles back to asc (never off)', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'desc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /date ↓/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'asc' });
  });

  it('renders a highly-rated toggle with its count badge', () => {
    const { onFilterChange } = renderToolbar({
      showHighlyRated: true,
      counts: { highlyRated: 7 },
    });
    expect(screen.getByText('7')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /highly rated/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ highlyRatedOnly: true });
  });

  it('renders a film tri-state toggle that cycles off -> film', () => {
    const { onFilterChange } = renderToolbar({ showFilm: true });
    fireEvent.click(screen.getByRole('button', { name: /film/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ filmFilter: 'film' });
  });

  it('opens a dimension dropdown and toggles a value via FilterChip', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: { selectedTags: { label: 'Tags', options: ['sunset', 'forest'] } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    fireEvent.click(screen.getByRole('button', { name: 'sunset' }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedTags: ['sunset'] });
  });

  it('greys out + disables an option absent from filteredAvailable', () => {
    renderToolbar({
      dimensions: { selectedTags: { label: 'Tags', options: ['sunset', 'forest'] } },
      filteredAvailable: { selectedTags: ['sunset'] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.getByRole('button', { name: 'forest' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'sunset' })).not.toBeDisabled();
  });

  it('renders the density slider when onDensityChange is provided', () => {
    const onDensityChange = jest.fn();
    renderToolbar({ density: 4, onDensityChange });
    const slider = screen.getByLabelText('Row density') as HTMLInputElement;
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.value).toBe('4');
    fireEvent.change(slider, { target: { value: '8' } });
    expect(onDensityChange).toHaveBeenCalledWith(8);
  });

  it('omits the density slider when onDensityChange is not provided', () => {
    renderToolbar({});
    expect(screen.queryByLabelText('Row density')).toBeNull();
  });

  it('renders a reset button only when a filter is active', () => {
    const { rerender } = render(
      <FilterToolbar
        filterState={INITIAL_FILTER_STATE}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showDateSort
      />
    );
    expect(screen.queryByRole('button', { name: /reset all filters/i })).toBeNull();
    rerender(
      <FilterToolbar
        filterState={{ ...INITIAL_FILTER_STATE, highlyRatedOnly: true }}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showHighlyRated
      />
    );
    expect(screen.getByRole('button', { name: /reset all filters/i })).toBeInTheDocument();
  });

  it('hides the reset button for a two-state date sort with no other filters', () => {
    // The always-on chronological Date sort must not surface the reset (×) on load.
    renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' },
    });
    expect(screen.queryByRole('button', { name: /reset all filters/i })).toBeNull();
  });

  it('preserves the date direction when resetting in two-state mode', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      showHighlyRated: true,
      dateTwoState: true,
      filterState: {
        ...INITIAL_FILTER_STATE,
        dateSortDirection: 'desc',
        highlyRatedOnly: true,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateSortDirection: 'desc', highlyRatedOnly: false })
    );
  });
});
