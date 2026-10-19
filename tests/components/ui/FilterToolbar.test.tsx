import { fireEvent, render, screen, within } from '@testing-library/react';
import { type ComponentProps } from 'react';

import { CHIP_WEIGHT } from '@/app/components/ui/FilterToolbar/chipWeights';
import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { DENSITY_TIERS } from '@/app/constants';
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
  it('labels the sort chip Order and cycles off -> asc on click', () => {
    const { onFilterChange } = renderToolbar({ showDateSort: true });
    fireEvent.click(screen.getByRole('button', { name: 'Order: curated' }));
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'asc' });
  });

  it('closes the cycle from desc back to off', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'desc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Order: newest first' }));
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'off' });
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
    expect(screen.getByRole('button', { name: 'Order: oldest first' })).toBeInTheDocument();
    unmount();

    render(
      <FilterToolbar
        filterState={{ ...INITIAL_FILTER_STATE, dateSortDirection: 'desc' }}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showDateSort
      />
    );
    expect(screen.getByRole('button', { name: 'Order: newest first' })).toBeInTheDocument();
  });

  it('two-state date toggle cycles asc <-> desc and never shows the off label', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' },
    });
    const chip = screen.getByRole('button', { name: 'Order: oldest first' });
    fireEvent.click(chip);
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'desc' });
  });

  it('two-state date toggle from desc cycles back to asc (never off)', () => {
    const { onFilterChange } = renderToolbar({
      showDateSort: true,
      dateTwoState: true,
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'desc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Order: newest first' }));
    expect(onFilterChange).toHaveBeenCalledWith({ dateSortDirection: 'asc' });
  });

  it('labels the highly-rated toggle Rated and badges its count', () => {
    const { onFilterChange } = renderToolbar({
      showHighlyRated: true,
      counts: { highlyRated: 7 },
    });
    expect(screen.getByText('7')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^rated/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ highlyRatedOnly: true });
  });

  describe('Following toggle', () => {
    const followingChip = () => screen.getByRole('button', { name: /following/i });

    it('is absent by default, so an ordinary collection page never shows it', () => {
      renderToolbar({ showHighlyRated: true });
      expect(screen.queryByRole('button', { name: /following/i })).toBeNull();
    });

    /**
     * Unlit means everything is showing — the opposite default to the Hidden chip, because this
     * one narrows when it is on rather than when it is off.
     */
    it('starts deselected, badged with how many the viewer follows', () => {
      renderToolbar({ showFollowingToggle: true, counts: { following: 6 } });
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(followingChip().className).not.toMatch(/active/);
    });

    it('selects on click, narrowing to the followed collections', () => {
      const { onFilterChange } = renderToolbar({ showFollowingToggle: true });
      fireEvent.click(followingChip());
      expect(onFilterChange).toHaveBeenCalledWith({ followedOnly: true });
    });

    it('deselects from the selected state', () => {
      const { onFilterChange } = renderToolbar({
        showFollowingToggle: true,
        filterState: { ...INITIAL_FILTER_STATE, followedOnly: true },
      });
      const chip = followingChip();
      expect(chip.className).toMatch(/active/);
      fireEvent.click(chip);
      expect(onFilterChange).toHaveBeenCalledWith({ followedOnly: false });
    });

    it('counts as an active filter only once selected', () => {
      const { unmount } = render(
        <FilterToolbar
          filterState={INITIAL_FILTER_STATE}
          onFilterChange={jest.fn()}
          dimensions={{}}
          showFollowingToggle
        />
      );
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeDisabled();
      unmount();

      renderToolbar({
        showFollowingToggle: true,
        filterState: { ...INITIAL_FILTER_STATE, followedOnly: true },
      });
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeEnabled();
    });
  });

  describe('admin Hidden toggle', () => {
    const hiddenChip = () => screen.getByRole('button', { name: /hidden/i });

    it('is absent by default, so a non-admin never sees it', () => {
      renderToolbar({ showHighlyRated: true });
      expect(screen.queryByRole('button', { name: /hidden/i })).toBeNull();
    });

    it('starts selected, because an admin sees everything by default', () => {
      renderToolbar({ showHiddenToggle: true, counts: { hidden: 3 } });
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(hiddenChip().className).toMatch(/active/);
    });

    it('deselects on click, previewing the general-audience view', () => {
      const { onFilterChange } = renderToolbar({ showHiddenToggle: true });
      fireEvent.click(hiddenChip());
      expect(onFilterChange).toHaveBeenCalledWith({ showHidden: false });
    });

    it('reselects from the deselected state', () => {
      const { onFilterChange } = renderToolbar({
        showHiddenToggle: true,
        filterState: { ...INITIAL_FILTER_STATE, showHidden: false },
      });
      const chip = hiddenChip();
      expect(chip.className).not.toMatch(/active/);
      fireEvent.click(chip);
      expect(onFilterChange).toHaveBeenCalledWith({ showHidden: true });
    });

    it('counts as an active filter only once deselected', () => {
      const { unmount } = render(
        <FilterToolbar
          filterState={INITIAL_FILTER_STATE}
          onFilterChange={jest.fn()}
          dimensions={{}}
          showHiddenToggle
        />
      );
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeDisabled();
      unmount();

      renderToolbar({
        showHiddenToggle: true,
        filterState: { ...INITIAL_FILTER_STATE, showHidden: false },
      });
      expect(screen.getByRole('button', { name: /reset all filters/i })).toBeEnabled();
    });

    it('resets back to showing everything', () => {
      const { onFilterChange } = renderToolbar({
        showHiddenToggle: true,
        filterState: { ...INITIAL_FILTER_STATE, showHidden: false },
      });
      fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }));
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ showHidden: true }));
    });
  });

  it('renders a film tri-state toggle that cycles off -> film', () => {
    const { onFilterChange } = renderToolbar({ showFilm: true });
    fireEvent.click(screen.getByRole('button', { name: /film/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ filmFilter: 'film' });
  });

  it('opens a dimension dropdown and toggles a value via an option Chip', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: { selectedTags: { label: 'Tags', options: ['sunset', 'forest'] } },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Tags/ }));
    fireEvent.click(screen.getByRole('button', { name: 'sunset' }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedTags: ['sunset'] });
  });

  it('greys out + disables an option absent from filteredAvailable', () => {
    renderToolbar({
      dimensions: { selectedTags: { label: 'Tags', options: ['sunset', 'forest'] } },
      filteredAvailable: { selectedTags: ['sunset'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Tags/ }));
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
    const TIERS = DENSITY_TIERS.map(tier => ({
      key: tier.key,
      label: tier.label,
      value: tier.desktop,
    }));

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
      expect(onDensityTierSelect).toHaveBeenCalledWith(DENSITY_TIERS[2].desktop);
    });

    it('highlights the nearest tier for an off-tier stored density without snapping it', () => {
      const { onDensityTierSelect } = renderTiers({ density: 6, activeDensityTier: 'small' });
      expect(screen.getByRole('radio', { name: 'Small photos' })).toBeChecked();
      expect(onDensityTierSelect).not.toHaveBeenCalled();
    });
  });

  it('renders the reset button always, disabled until a filter is active', () => {
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

  const openDate = () => fireEvent.click(screen.getByRole('button', { name: /^date/i }));

  it('renders the days inside one Date dropdown and never as flat chips', () => {
    renderToolbar({ dimensions: threeDays });
    expect(screen.getByRole('button', { name: /^date/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /jul 20/i })).toBeNull();
    openDate();
    expect(screen.getByRole('button', { name: /jul 20/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jul 22/i })).toBeInTheDocument();
  });

  it('toggles a date from the dropdown', () => {
    const { onFilterChange } = renderToolbar({ dimensions: threeDays });
    openDate();
    fireEvent.click(screen.getByRole('button', { name: /jul 21/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedDates: ['2026-07-21'] });
  });

  it('switches to the newly chosen date rather than selecting both', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: threeDays,
      filterState: { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] },
    });
    openDate();
    fireEvent.click(screen.getByRole('button', { name: /jul 22/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedDates: ['2026-07-22'] });
  });

  it('clears the date when the chosen option is clicked again', () => {
    const { onFilterChange } = renderToolbar({
      dimensions: threeDays,
      filterState: { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] },
    });
    openDate();
    fireEvent.click(screen.getByRole('button', { name: /^jul 20/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedDates: [] });
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

  it('greys out a date that is unreachable under other filters', () => {
    renderToolbar({
      dimensions: threeDays,
      filteredAvailable: { selectedDates: ['2026-07-20'] },
    });
    openDate();
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
    it('keeps the reset button mounted in the DOM across every active-filter state', () => {
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

    it('renders the same Order chip DOM shape (icon + label) in every direction, flipping only for desc', () => {
      const directions = ['off', 'asc', 'desc'] as const;
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
        const icon = chip.querySelector('svg');
        expect(icon).not.toBeNull();
        expect(chip.querySelector('span')?.textContent).toBe('Order');
        expect(chip.children).toHaveLength(2);
        expect(icon?.getAttribute('class')).toEqual(
          dateSortDirection === 'desc'
            ? expect.stringMatching(/flipped/)
            : expect.not.stringMatching(/flipped/)
        );
        unmount();
      }
    });

    it('never applies a font-weight-only active class to the Order chip or a dropdown trigger', () => {
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

    /**
     * `count` is optional because a section whose read failed has no count. Badging it `0` would
     * assert the section is empty right beside a body that has just said the number is unknown —
     * the same lie the section copy stopped telling, shrunk to fit a chip.
     */
    it('renders a section with no count as its bare label, with no badge', () => {
      renderToolbar({
        sections: [{ key: 'saved', label: 'Saved', href: '/user?tab=saved' }],
        activeSectionKey: 'saved',
      });
      const chip = screen.getByRole('link', { name: 'Saved' });
      expect(chip.textContent).toBe('Saved');
    });

    /**
     * Scoped to the chip, and paired with a neighbour that genuinely counts 0, so the toolbar has
     * a `0` in it either way. A toolbar-wide `queryByText('0')` would pass here for the wrong
     * reason the moment no section on the bar happened to be empty.
     */
    it('does not print a 0 on the countless chip while its neighbour badges one', () => {
      renderToolbar({
        sections: [
          { key: 'collections', label: 'Collections', count: 0, href: '/user?tab=collections' },
          { key: 'saved', label: 'Saved', href: '/user?tab=saved' },
        ],
        activeSectionKey: 'saved',
      });
      const countless = screen.getByRole('link', { name: 'Saved' });
      const counted = screen.getByRole('link', { name: 'Collections' });

      expect(within(countless).queryByText('0')).not.toBeInTheDocument();
      expect(within(counted).getByText('0')).toBeInTheDocument();
    });

    it('still badges a section that reports a real count of 0', () => {
      renderToolbar({
        sections: [{ key: 'saved', label: 'Saved', count: 0, href: '/user?tab=saved' }],
        activeSectionKey: 'saved',
      });
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('keeps a countless section navigable and current like any other', () => {
      renderToolbar({
        sections: [
          { key: 'collections', label: 'Collections', count: 12, href: '/user?tab=collections' },
          { key: 'saved', label: 'Saved', href: '/user?tab=saved' },
        ],
        activeSectionKey: 'saved',
      });
      const chip = screen.getByRole('link', { name: 'Saved' });
      expect(chip).toHaveAttribute('href', '/user?tab=saved');
      expect(chip).toHaveAttribute('aria-current', 'page');
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('routes a section click through onSectionSelect instead of navigating', () => {
      const onSectionSelect = jest.fn();
      renderToolbar({ sections: SECTIONS, activeSectionKey: 'collections', onSectionSelect });
      fireEvent.click(screen.getByRole('link', { name: 'Images' }));
      expect(onSectionSelect).toHaveBeenCalledWith('images', '/user?tab=images');
    });

    it('keeps sections independent of the reset button', () => {
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

  it('renders a dimension trigger as an icon chip with a desktop caret and popup aria', () => {
    render(
      <FilterToolbar
        filterState={INITIAL_FILTER_STATE}
        onFilterChange={() => {}}
        dimensions={{ selectedPeople: { label: 'People', options: ['Ada', 'Grace'] } }}
      />
    );
    const trigger = screen.getByRole('button', { name: 'People' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-pressed');
    expect(trigger.className).toMatch(/chip/);
    expect(trigger.querySelector('svg')).not.toBeNull();
    expect(trigger.lastElementChild?.textContent).toBe('▾');
    expect(trigger.lastElementChild?.className).toMatch(/caret/);
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger.className).toMatch(/active/);
    expect(trigger.lastElementChild?.textContent).toBe('▴');
  });
});

describe('FilterToolbar upper tier', () => {
  const sections = [
    { key: 'collections', label: 'Collections', count: 2, href: '/user?tab=collections' },
    { key: 'images', label: 'Images', count: 1, href: '/user?tab=images' },
  ];

  it('renders the sections as one segmented control above the filter cluster', () => {
    const { container } = render(
      <FilterToolbar
        filterState={INITIAL_FILTER_STATE}
        onFilterChange={() => {}}
        dimensions={{}}
        sections={sections}
        activeSectionKey="collections"
        showFollowingToggle
      />
    );
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(nav.closest('.upper')).not.toBeNull();
    expect(nav.closest('.controls')).toBeNull();
    expect(screen.getByRole('button', { name: /^Following/ }).closest('.controls')).not.toBeNull();
    expect(container.querySelector('.separator')).toBeNull();
  });

  it('orders the upper tier by weight, highest first, sections leading', () => {
    const { container } = render(
      <FilterToolbar
        filterState={INITIAL_FILTER_STATE}
        onFilterChange={() => {}}
        dimensions={{}}
        sections={sections}
        activeSectionKey="collections"
        extras={[
          {
            key: 'passkey',
            weight: CHIP_WEIGHT.passkey,
            node: <button type="button">Face</button>,
          },
          { key: 'share', weight: CHIP_WEIGHT.share, node: <button type="button">Share</button> },
          {
            key: 'contact',
            weight: CHIP_WEIGHT.contact,
            node: <button type="button">Contact</button>,
          },
        ]}
      />
    );
    const upper = container.querySelector('.upper') as HTMLElement;
    const order = Array.from(upper.querySelectorAll('nav, button')).map(
      el => el.getAttribute('aria-label') ?? el.textContent
    );
    expect(order).toEqual(['Sections', 'Share', 'Contact', 'Face']);
  });

  it('renders an icon section as an icon-only link on phones, named with its count', () => {
    render(
      <FilterToolbar
        filterState={INITIAL_FILTER_STATE}
        onFilterChange={() => {}}
        dimensions={{}}
        sections={[
          {
            key: 'saved',
            label: 'Saved',
            icon: 'saved',
            count: 11,
            href: '/user?tab=saved',
          },
          { key: 'images', label: 'Images', icon: 'images', href: '/user?tab=images' },
        ]}
        activeSectionKey="saved"
      />
    );
    const saved = screen.getByRole('link', { name: 'Saved, 11' });
    expect(saved).toHaveAttribute('aria-current', 'page');
    expect(saved.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Saved').className).toMatch(/labelWide/);
    expect(screen.getByRole('link', { name: 'Images' })).not.toHaveAttribute('aria-current');
  });

  it('renders no upper tier on a page with neither sections nor extras', () => {
    const { container } = render(
      <FilterToolbar
        filterState={INITIAL_FILTER_STATE}
        onFilterChange={() => {}}
        dimensions={{}}
        showDateSort
      />
    );
    expect(container.querySelector('.upper')).toBeNull();
  });
});

describe('FilterToolbar active-filter summary', () => {
  const dimensions = {
    selectedCameras: { label: 'Camera', options: ['Nikon FM2', 'Leica M6'] },
    selectedTags: { label: 'Tag', options: ['sunset', 'coast'] },
  };

  it('names the selected value, which the dropdown trigger never does', () => {
    renderToolbar({
      dimensions,
      filterState: { ...INITIAL_FILTER_STATE, selectedCameras: ['Nikon FM2'] },
    });
    expect(
      screen.getByRole('button', { name: 'Remove Nikon FM2 from Camera' })
    ).toBeInTheDocument();
  });

  it('removes only the badge clicked, leaving the rest of the dimension alone', () => {
    const { onFilterChange } = renderToolbar({
      dimensions,
      filterState: { ...INITIAL_FILTER_STATE, selectedTags: ['sunset', 'coast'] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove sunset from Tag' }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedTags: ['coast'] });
  });

  it('shows nothing while no dimension is selected', () => {
    renderToolbar({ dimensions });
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });

  it('summarises a selected date in a removable badge', () => {
    const options = ['2026-07-10', '2026-07-11'];
    renderToolbar({
      dimensions: { selectedDates: { label: 'Date', options } },
      filterState: { ...INITIAL_FILTER_STATE, selectedDates: [options[0]!] },
    });
    expect(screen.getByRole('button', { name: 'Remove 2026-07-10 from Date' })).toBeInTheDocument();
  });
});

describe('FilterToolbar Date control (years and days)', () => {
  const dimensions = {
    selectedYears: { label: 'Year', options: ['2019', '2024', '2026'] },
    selectedDates: {
      label: 'Date',
      options: ['2026-07-20', '2026-07-21'],
      optionLabels: { '2026-07-20': 'Jul 20', '2026-07-21': 'Jul 21' },
    },
  };

  it('renders one Date trigger and no year or day chips', () => {
    renderToolbar({ dimensions });
    expect(screen.getByRole('button', { name: /^date/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^year/i })).toBeNull();
    for (const label of ['2019', '2024', '2026', 'Jul 20', 'Jul 21']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });

  it('lists the years and the days together in the one dropdown', () => {
    renderToolbar({ dimensions });
    fireEvent.click(screen.getByRole('button', { name: /^date/i }));
    for (const label of ['2019', '2024', '2026', 'Jul 20', 'Jul 21']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('shows the Date control for years alone', () => {
    renderToolbar({ dimensions: { selectedYears: dimensions.selectedYears } });
    fireEvent.click(screen.getByRole('button', { name: /^date/i }));
    expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument();
  });

  it('selects a year and closes the dropdown', () => {
    const { onFilterChange } = renderToolbar({ dimensions });
    fireEvent.click(screen.getByRole('button', { name: /^date/i }));
    fireEvent.click(screen.getByRole('button', { name: '2024' }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedYears: ['2024'] });
    expect(screen.queryByRole('button', { name: '2019' })).toBeNull();
  });

  it('switches rather than accumulates, since an image has one capture year', () => {
    const { onFilterChange } = renderToolbar({
      dimensions,
      filterState: { ...INITIAL_FILTER_STATE, selectedYears: ['2024'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^date/i }));
    fireEvent.click(screen.getByRole('button', { name: '2026' }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedYears: ['2026'] });
  });

  it('clears the year when the sole selection is clicked again', () => {
    const { onFilterChange } = renderToolbar({
      dimensions,
      filterState: { ...INITIAL_FILTER_STATE, selectedYears: ['2024'] },
    });
    fireEvent.click(screen.getByRole('button', { name: /^date/i }));
    fireEvent.click(screen.getByRole('button', { name: /^2024/ }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedYears: [] });
  });

  it('summarises a selected year in a badge', () => {
    renderToolbar({
      dimensions,
      filterState: { ...INITIAL_FILTER_STATE, selectedYears: ['2019'] },
    });
    expect(screen.getByRole('button', { name: 'Remove 2019 from Year' })).toBeInTheDocument();
  });

  it('greys out a year no longer reachable under the other active filters', () => {
    renderToolbar({ dimensions, filteredAvailable: { selectedYears: ['2026'] } });
    fireEvent.click(screen.getByRole('button', { name: /^date/i }));
    expect(screen.getByRole('button', { name: '2019' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2026' })).toBeEnabled();
  });
});

/**
 * Film stock sits under the film/digital toggle, so the toggle owns clearing it. These cases pin
 * that leaving `film` in either direction takes the selection with it — a stock still narrowing
 * the results from behind a control the caller has stopped rendering is the failure to avoid.
 */
describe('FilterToolbar — film stock', () => {
  const withStock = {
    ...INITIAL_FILTER_STATE,
    filmFilter: 'film' as const,
    selectedFilmTypes: ['Kodak Portra 400'],
  };

  it('clears the stock selection when the toggle moves from film to digital', () => {
    const { onFilterChange } = renderToolbar({ showFilm: true, filterState: withStock });
    fireEvent.click(screen.getByRole('button', { name: /film/i }));
    expect(onFilterChange).toHaveBeenCalledWith({
      filmFilter: 'digital',
      selectedFilmTypes: [],
    });
  });

  it('clears it when the toggle cycles from digital back to off', () => {
    const { onFilterChange } = renderToolbar({
      showFilm: true,
      filterState: { ...withStock, filmFilter: 'digital' },
    });
    fireEvent.click(screen.getByRole('button', { name: /digital/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ filmFilter: 'off', selectedFilmTypes: [] });
  });

  it('does not clear it on the way into film', () => {
    const { onFilterChange } = renderToolbar({ showFilm: true });
    fireEvent.click(screen.getByRole('button', { name: /film/i }));
    expect(onFilterChange).toHaveBeenCalledWith({ filmFilter: 'film' });
  });

  it('renders the stock dropdown and selects one stock at a time', () => {
    const { onFilterChange } = renderToolbar({
      showFilm: true,
      filterState: { ...INITIAL_FILTER_STATE, filmFilter: 'film' },
      dimensions: {
        selectedFilmTypes: {
          label: 'Film stock',
          options: ['Cinestill 800T', 'Kodak Portra 400'],
        },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Film stock/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Kodak Portra 400' }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedFilmTypes: ['Kodak Portra 400'] });
  });

  it('switches rather than accumulates, because a frame has one stock', () => {
    const { onFilterChange } = renderToolbar({
      showFilm: true,
      filterState: withStock,
      dimensions: {
        selectedFilmTypes: {
          label: 'Film stock',
          options: ['Cinestill 800T', 'Kodak Portra 400'],
        },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Film stock/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cinestill 800T' }));
    expect(onFilterChange).toHaveBeenCalledWith({ selectedFilmTypes: ['Cinestill 800T'] });
  });

  it('renders no stock dropdown when the caller does not pass the dimension', () => {
    renderToolbar({ showFilm: true, filterState: withStock });
    expect(screen.queryByRole('button', { name: 'Film stock' })).not.toBeInTheDocument();
  });

  describe('mobile sheet', () => {
    const originalWidth = window.innerWidth;
    const tags = { selectedTags: { label: 'Tags', options: ['sunset', 'forest'] } };

    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    });

    it('opens the options in a dialog labelled by a heading carrying the dimension label', () => {
      renderToolbar({ dimensions: tags });
      fireEvent.click(screen.getByRole('button', { name: /^Tags/ }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAccessibleName('Tags');
      expect(within(dialog).getByRole('heading', { name: 'Tags' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'sunset' })).toBeInTheDocument();
    });

    it('applies the selected option and closes the sheet, returning focus to the chip', () => {
      const { onFilterChange } = renderToolbar({ dimensions: tags });
      const trigger = screen.getByRole('button', { name: /^Tags/ });
      fireEvent.click(trigger);
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'sunset' }));
      expect(onFilterChange).toHaveBeenCalledWith({ selectedTags: ['sunset'] });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(trigger).toHaveFocus();
    });

    it('closes on Escape and on a backdrop tap, returning focus to the chip', () => {
      renderToolbar({ dimensions: tags });
      const trigger = screen.getByRole('button', { name: /^Tags/ });
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(trigger).toHaveFocus();

      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(trigger).toHaveFocus();
    });

    it('does not close the sheet on a press inside it before the tap lands', () => {
      const { onFilterChange } = renderToolbar({ dimensions: tags });
      fireEvent.click(screen.getByRole('button', { name: /^Tags/ }));
      const option = within(screen.getByRole('dialog')).getByRole('button', { name: 'forest' });
      fireEvent.mouseDown(option);
      fireEvent.touchStart(option);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(option);
      expect(onFilterChange).toHaveBeenCalledWith({ selectedTags: ['forest'] });
    });
  });
});

describe('FilterToolbar icon chips', () => {
  it('names each icon chip by its control, state and count', () => {
    renderToolbar({
      showDateSort: true,
      showHighlyRated: true,
      showHiddenToggle: true,
      showFollowingToggle: true,
      showFilm: true,
      counts: { highlyRated: 7, hidden: 27, following: 0 },
      filterState: { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc', filmFilter: 'film' },
    });
    for (const name of [
      'Order: oldest first',
      'Rated only, 7',
      'Show hidden items, 27',
      'Following only, 0',
      'Film only',
      'Reset all filters',
    ]) {
      const chip = screen.getByRole('button', { name });
      expect(chip).toHaveAttribute('aria-label', name);
      expect(chip.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('lights the Hidden chip only while hidden items show', () => {
    const { unmount } = render(
      <FilterToolbar
        filterState={{ ...INITIAL_FILTER_STATE, showHidden: true }}
        onFilterChange={jest.fn()}
        dimensions={{}}
        showHiddenToggle
      />
    );
    expect(screen.getByRole('button', { name: 'Show hidden items' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    unmount();
    renderToolbar({
      showHiddenToggle: true,
      filterState: { ...INITIAL_FILTER_STATE, showHidden: false },
    });
    expect(screen.getByRole('button', { name: 'Show hidden items' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('keeps the Digital label visible on phones, where the film icon alone cannot tell it apart', () => {
    renderToolbar({
      showFilm: true,
      filterState: { ...INITIAL_FILTER_STATE, filmFilter: 'digital' },
    });
    const chip = screen.getByRole('button', { name: 'Digital only' });
    expect(within(chip).getByText('Digital').className).not.toMatch(/labelWide/);
  });

  it('keeps text-only dropdowns for dimensions with no approved icon', () => {
    renderToolbar({ dimensions: { selectedTags: { label: 'Tags', options: ['sunset'] } } });
    const trigger = screen.getByRole('button', { name: /^Tags/ });
    expect(trigger.querySelector('svg')).toBeNull();
    expect(trigger).not.toHaveAttribute('aria-label');
  });

  it('gives an active-filter badge a trailing remove icon', () => {
    renderToolbar({
      dimensions: { selectedTags: { label: 'Tag', options: ['sunset'] } },
      filterState: { ...INITIAL_FILTER_STATE, selectedTags: ['sunset'] },
    });
    const badge = screen.getByRole('button', { name: 'Remove sunset from Tag' });
    expect(badge.querySelector('svg')).not.toBeNull();
  });

  it('draws one icon and no text per photo-size tier', () => {
    renderToolbar({
      density: 5,
      onDensityChange: jest.fn(),
      densityTiers: DENSITY_TIERS.map(tier => ({
        key: tier.key,
        label: tier.label,
        value: tier.desktop,
      })),
      activeDensityTier: 'medium',
    });
    const group = screen.getByRole('radiogroup', { name: 'Photo size' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    for (const radio of radios) {
      expect(radio.querySelectorAll('svg')).toHaveLength(1);
      expect(radio.textContent).toBe('');
    }
  });
});
