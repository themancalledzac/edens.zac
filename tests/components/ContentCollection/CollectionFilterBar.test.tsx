import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';

import CollectionFilterBar from '@/app/components/ContentCollection/CollectionFilterBar';
import { type CollectionInfoOptions } from '@/app/components/ContentCollection/CollectionFilterContext';
import { INITIAL_COLLECTION_FILTER_STATE } from '@/app/types/GalleryFilter';

const emptyDim = { values: [] as readonly string[], filterable: false };

// Minimal options with no filter dimensions — isolates the dev density slider.
const filterOptions: CollectionInfoOptions = {
  tags: emptyDim,
  people: emptyDim,
  cameras: emptyDim,
  lenses: emptyDim,
  locations: emptyDim,
  lensTypes: { values: [], filterable: false },
  showHighlyRated: false,
};

function renderBar(overrides: Partial<ComponentProps<typeof CollectionFilterBar>> = {}) {
  const onDensityChange = jest.fn();
  const onFilterChange = jest.fn();
  render(
    <CollectionFilterBar
      filterState={INITIAL_COLLECTION_FILTER_STATE}
      filterOptions={filterOptions}
      filteredAvailable={null}
      onFilterChange={onFilterChange}
      density={4}
      onDensityChange={onDensityChange}
      showDensitySlider
      {...overrides}
    />
  );
  return { onDensityChange, onFilterChange };
}

describe('CollectionFilterBar — dev-only density slider', () => {
  it('renders a 1-10 range slider reflecting the current density when enabled', () => {
    renderBar({ density: 4 });
    const slider = screen.getByLabelText('Row density') as HTMLInputElement;
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.getAttribute('min')).toBe('1');
    expect(slider.getAttribute('max')).toBe('10');
    expect(slider.value).toBe('4');
  });

  it('calls onDensityChange with the new numeric value when moved', () => {
    const { onDensityChange } = renderBar({ density: 4 });
    fireEvent.change(screen.getByLabelText('Row density'), { target: { value: '8' } });
    expect(onDensityChange).toHaveBeenCalledWith(8);
  });

  it('does not render the slider for regular visitors (showDensitySlider false)', () => {
    renderBar({ showDensitySlider: false });
    expect(screen.queryByLabelText('Row density')).toBeNull();
  });
});
