import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';

import {
  FilterToolbar,
  MAX_FLAT_DATE_CHIPS,
} from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import { dayLabels } from '@/app/utils/collectionDates';

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
  it('labels the sort chip Order and cycles off -> asc on click', () => {
    const { onFilterChange } = renderToolbar({ showDateSort: true });
    fireEvent.click(screen.getByRole('button', { name: /^order$/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'asc' });
  });

  it('renders directional Order labels', () => {
    const { unmount } = render(
      <FilterToolbar
        filterState={{ ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' }}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showDateSort
      />
    );
    // Exact-string names, not regex: '^' and 'v' are regex-significant.
    expect(screen.getByRole('button', { name: 'Order ^' })).toBeInTheDocument();
    unmount();

    render(
      <FilterToolbar
        filterState={{ ...INITIAL_FILTER_STATE, dateSortDirection: 'desc' }}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showDateSort
      />
    );
    expect(screen.getByRole('button', { name: 'Order v' })).toBeInTheDocument();
  });

  it('two-state date toggle cycles asc <-> desc and never shows the off label', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' },
    });
    // Shows the directional label, not the neutral "Order".
    const chip = screen.getByRole('button', { name: /order \^/i });
    expect(screen.queryByRole('button', { name: /^order$/i })).toBeNull();
    fireEvent.click(chip);
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'desc' });
  });

  it('two-state date toggle from desc cycles back to asc (never off)', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'desc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /order v/i }));
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

  it('renders the density slider in the slider variant', () => {
    const onDensityChange = jest.fn();
    renderToolbar({ density: 4, onDensityChange, densityVariant: 'slider' });
    const slider = screen.getByLabelText('Row density') as HTMLInputElement;
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.value).toBe('4');
    fireEvent.change(slider, { target: { value: '8' } });
    expect(onDensityChange).toHaveBeenCalledWith(8);
  });

  it('omits the density control entirely when onDensityChange is not provided', () => {
    renderToolbar({});
    expect(screen.queryByLabelText('Row density')).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Photo size' })).toBeNull();
  });

  describe('photo-size tiers (default visitor variant)', () => {
    const TIERS = [
      { key: 'large', label: 'Large photos', value: 2 },
      { key: 'medium', label: 'Medium photos', value: 4 },
      { key: 'small', label: 'Small photos', value: 7 },
    ];

    function renderTiers(overrides: Partial<Props> = {}) {
      const onDensityTierSelect = jest.fn();
      renderToolbar({
        density: 4,
        onDensityChange: jest.fn(),
        densityTiers: TIERS,
        activeDensityTier: 'medium',
        onDensityTierSelect,
        ...overrides,
      });
      return { onDensityTierSelect };
    }

    it('renders a radiogroup of tiers instead of the raw slider by default', () => {
      renderTiers();
      expect(screen.getByRole('radiogroup', { name: 'Photo size' })).toBeInTheDocument();
      // The raw density number is meaningless to a visitor and runs backwards from photo size.
      expect(screen.queryByLabelText('Row density')).toBeNull();
    });

    it('names each tier by photo size, never by the density number', () => {
      renderTiers();
      for (const tier of TIERS) {
        expect(screen.getByRole('radio', { name: tier.label })).toBeInTheDocument();
      }
      expect(screen.queryByText(/density/i)).toBeNull();
    });

    it('marks exactly the active tier as checked', () => {
      renderTiers();
      expect(screen.getByRole('radio', { name: 'Medium photos' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Large photos' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Small photos' })).not.toBeChecked();
    });

    it('emits the tier value verbatim, bypassing the viewport-scaling handler', () => {
      const { onDensityTierSelect } = renderTiers();
      fireEvent.click(screen.getByRole('radio', { name: 'Small photos' }));
      expect(onDensityTierSelect).toHaveBeenCalledWith(7);
    });

    it('highlights the nearest tier for an off-tier stored density without snapping it', () => {
      // A collection stored at 6 keeps laying out at 6; the bar only highlights Small.
      const { onDensityTierSelect } = renderTiers({ density: 6, activeDensityTier: 'small' });
      expect(screen.getByRole('radio', { name: 'Small photos' })).toBeChecked();
      expect(onDensityTierSelect).not.toHaveBeenCalled();
    });
  });

  it('renders the reset button always, disabled until a filter is active', () => {
    // Always present in the DOM (so it never pops in/out and reflows the bar); only its
    // disabled state -- and CSS visibility, which jsdom cannot assert -- change.
    const { rerender } = render(
      <FilterToolbar
        filterState={INITIAL_FILTER_STATE}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showDateSort
      />
    );
    expect(screen.getByRole('button', { name: /reset all filters/i })).toBeDisabled();
    rerender(
      <FilterToolbar
        filterState={{ ...INITIAL_FILTER_STATE, highlyRatedOnly: true }}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showHighlyRated
      />
    );
    expect(screen.getByRole('button', { name: /reset all filters/i })).not.toBeDisabled();
  });

  it('disables the reset button for a two-state date sort with no other filters', () => {
    // The always-on chronological Date sort must not surface an active reset button on load.
    renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' },
    });
    expect(screen.getByRole('button', { name: /reset all filters/i })).toBeDisabled();
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

  const threeDays = {
    selectedDates: {
      label: 'Date',
      options: ['2026-07-20', '2026-07-21', '2026-07-22'],
      optionLabels: {
        '2026-07-20': 'Jul 20',
        '2026-07-21': 'Jul 21',
        '2026-07-22': 'Jul 22',
      },
    },
  };

  it('renders each date as a flat chip at or below the threshold', () => {
    renderToolbar({ dimensions: threeDays });
    expect(screen.getByRole('button', { name: /jul 20/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jul 21/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jul 22/i })).toBeInTheDocument();
    // Flat mode means no dropdown trigger for the dimension.
    expect(screen.queryByRole('button', { name: /^date$/i })).toBeNull();
  });

  it('toggles a date on click', () => {
    const { onFilterChange } = renderToolbar({ dimensions: threeDays });
    fireEvent.click(screen.getByRole('button', { name: /jul 21/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedDates: ['2026-07-21'] });
  });

  it('switches to the newly clicked date rather than selecting both', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: threeDays,
      filterState: { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /jul 22/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedDates: ['2026-07-22'] });
  });

  it('clears the date when the chosen chip is clicked again', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: threeDays,
      filterState: { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /jul 20/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedDates: [] });
  });

  it('switches the date from the dropdown fallback too', () => {
    const options = Array.from(
      { length: MAX_FLAT_DATE_CHIPS + 1 },
      (_, i) => `2026-07-${String(20 + i).padStart(2, '0')}`
    );
    const { onFilterChange } = renderToolbar({
      dimensions: { selectedDates: { label: 'Date', options, optionLabels: dayLabels(options) } },
      filterState: { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^date/i }));
    fireEvent.click(screen.getByRole('button', { name: /jul 25/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedDates: ['2026-07-25'] });
  });

  it('keeps multi-select for the accumulating dimensions', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: { selectedTags: { label: 'Tags', options: ['sunset', 'forest'] } },
      filterState: { ...INITIAL_FILTER_STATE, selectedTags: ['sunset'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^tags/i }));
    fireEvent.click(screen.getByRole('button', { name: /forest/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedTags: ['sunset', 'forest'] });
  });

  it('still renders flat chips at exactly the threshold', () => {
    const options = Array.from(
      { length: MAX_FLAT_DATE_CHIPS },
      (_, i) => `2026-07-${String(20 + i).padStart(2, '0')}`
    );
    renderToolbar({
      dimensions: { selectedDates: { label: 'Date', options, optionLabels: dayLabels(options) } },
    });
    expect(screen.getByRole('button', { name: 'Jul 20' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^date$/i })).toBeNull();
  });

  it('collapses to a dropdown above the threshold', () => {
    const options = Array.from(
      { length: MAX_FLAT_DATE_CHIPS + 1 },
      (_, i) => `2026-07-${String(20 + i).padStart(2, '0')}`
    );
    renderToolbar({
      dimensions: { selectedDates: { label: 'Date', options, optionLabels: dayLabels(options) } },
    });
    expect(screen.getByRole('button', { name: /^date/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /jul 20/i })).toBeNull();
  });

  it('greys out a date that is unreachable under other filters', () => {
    renderToolbar({
      dimensions: threeDays,
      filteredAvailable: { selectedDates: ['2026-07-20'] },
    });
    expect(screen.getByRole('button', { name: /jul 21/i })).toBeDisabled();
  });

  it('reset clears a selected date', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: threeDays,
      filterState: { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-21'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ selectedDates: [] }));
  });

  describe('layout stability (selection must never change which nodes are present)', () => {
    // These assertions pin STRUCTURAL invariants only -- jsdom has no layout engine, so none of
    // this measures real pixel widths. They exist to catch a regression of any of the three
    // known reflow causes: a weight class swapping in on .active, the Order chip's trailing
    // slot disappearing, or the reset button being conditionally unmounted.

    it('keeps the reset button mounted in the DOM across every active-filter state', () => {
      // No filters at all.
      const { unmount: unmount1 } = render(
        <FilterToolbar
          filterState={INITIAL_FILTER_STATE}
          onFilterChange={jest.fn()}
          dimensions={{}}
          showDateSort
        />
      );
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeInTheDocument();
      unmount1();

      // One filter active.
      const { unmount: unmount2 } = render(
        <FilterToolbar
          filterState={{ ...INITIAL_FILTER_STATE, highlyRatedOnly: true }}
          onFilterChange={jest.fn()}
          dimensions={{}}
          showHighlyRated
        />
      );
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeInTheDocument();
      unmount2();

      // Several filters active at once.
      render(
        <FilterToolbar
          filterState={{
            ...INITIAL_FILTER_STATE,
            highlyRatedOnly: true,
            filmFilter: 'film',
            dateSortDirection: 'desc',
          }}
          onFilterChange={jest.fn()}
          dimensions={{}}
          showDateSort
          showHighlyRated
          showFilm
        />
      );
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeInTheDocument();
    });

    it('renders the same Order chip DOM shape (label + trailing slot) in every direction', () => {
      const directions: Array<FilterState['dateSortDirection']> = ['off', 'asc', 'desc'];
      for (const dateSortDirection of directions) {
        const { unmount } = render(
          <FilterToolbar
            filterState={{ ...INITIAL_FILTER_STATE, dateSortDirection }}
            onFilterChange={jest.fn()}
            dimensions={{}}
            showDateSort
          />
        );
        const chip = screen.getByRole('button', { name: /^order/i });
        // The label text is always the fixed string "Order" ...
        expect(chip.firstChild?.textContent).toBe('Order');
        // ... and the trailing glyph slot is always present as its own element, even when empty.
        const trailingSlot = chip.querySelector('span');
        expect(trailingSlot).not.toBeNull();
        unmount();
      }
    });

    it('never applies a font-weight-only active class to the Order chip or a dropdown trigger', () => {
      // Regression guard for cause 1: .active and .dropdownTriggerActive must not carry a
      // bold-weight-only signal back in -- distinguishing an active chip must rely on the
      // foreground/background inversion (or opacity/background), not on width-changing weight.
      renderToolbar({
        showDateSort: true,
        dimensions: { selectedTags: { label: 'Tags', options: ['sunset'] } },
        filterState: {
          ...INITIAL_FILTER_STATE,
          dateSortDirection: 'asc',
          selectedTags: ['sunset'],
        },
      });
      const orderChip = screen.getByRole('button', { name: /^order/i });
      expect(orderChip.className).toMatch(/active/);
    });
  });

  describe('sections', () => {
    const SECTIONS = [
      { key: 'collections', label: 'Collections', count: 12, href: '/user?tab=collections' },
      { key: 'images', label: 'Images', count: 1, href: '/user?tab=images' },
      { key: 'saved', label: 'Saved', count: 3, href: '/user?tab=saved' },
    ] as const;

    it('renders each section as a navigating chip with its count', () => {
      renderToolbar({ sections: SECTIONS, activeSectionKey: 'collections' });
      for (const section of SECTIONS) {
        const chip = screen.getByRole('link', { name: new RegExp(section.label, 'i') });
        expect(chip).toHaveAttribute('href', section.href);
      }
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('marks exactly one section current', () => {
      renderToolbar({ sections: SECTIONS, activeSectionKey: 'saved' });
      const current = screen
        .getAllByRole('link')
        .filter(link => link.getAttribute('aria-current') === 'page');
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveTextContent('Saved');
    });

    it('renders no section chips when the page is unsectioned', () => {
      renderToolbar({ showDateSort: true });
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('renders the bar with sections alone, no facet dimensions needed', () => {
      // This is what lets /user — which has no tags/people/cameras of its own — still show the
      // shared bar, and with it the photo-size control.
      renderToolbar({
        sections: SECTIONS,
        activeSectionKey: 'collections',
        density: 4,
        densityMax: 10,
        onDensityChange: jest.fn(),
        densityTiers: [{ key: 'medium', label: 'Medium photos', value: 4 }],
        activeDensityTier: 'medium',
      });
      expect(screen.getAllByRole('link')).toHaveLength(3);
      expect(screen.getByRole('radiogroup', { name: 'Photo size' })).toBeInTheDocument();
    });

    it('keeps sections independent of the reset button', () => {
      // Reset clears FilterState. Sections are not in FilterState, so a reset must never
      // deselect the current section or navigate away from it.
      const { onFilterChange } = renderToolbar({
        sections: SECTIONS,
        activeSectionKey: 'saved',
        showHighlyRated: true,
        filterState: { ...INITIAL_FILTER_STATE, highlyRatedOnly: true },
      });
      fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }));
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.not.objectContaining({ section: expect.anything() })
      );
      const current = screen
        .getAllByRole('link')
        .filter(link => link.getAttribute('aria-current') === 'page');
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveTextContent('Saved');
    });
  });
});
