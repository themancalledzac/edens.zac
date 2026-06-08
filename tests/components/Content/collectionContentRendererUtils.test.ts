/**
 * Unit tests for the pure helpers extracted from {@link CollectionContentRenderer}.
 */

import {
  getClickEligibility,
  toCollectionDimensions,
} from '@/app/components/Content/collectionContentRendererUtils';
import { type CollectionInfoOptions } from '@/app/components/ContentCollection/CollectionFilterContext';

const dim = (values: readonly string[], filterable: boolean) => ({ values, filterable });

const options = (overrides: Partial<CollectionInfoOptions> = {}): CollectionInfoOptions => ({
  tags: dim([], false),
  people: dim([], false),
  cameras: dim([], false),
  lenses: dim([], false),
  locations: dim([], false),
  lensTypes: { values: [], filterable: false },
  showHighlyRated: false,
  ...overrides,
});

describe('toCollectionDimensions', () => {
  it('returns no dimensions when nothing is filterable', () => {
    expect(toCollectionDimensions(options())).toEqual({});
  });

  it('skips a dimension that is filterable but has no values', () => {
    expect(toCollectionDimensions(options({ tags: dim([], true) }))).toEqual({});
  });

  it('maps a filterable dimension with values to a labelled dropdown', () => {
    const result = toCollectionDimensions(options({ people: dim(['Ann', 'Bo'], true) }));
    expect(result).toEqual({ selectedPeople: { label: 'People', options: ['Ann', 'Bo'] } });
  });

  it('maps tags, cameras, and locations with their labels', () => {
    const result = toCollectionDimensions(
      options({
        tags: dim(['x'], true),
        cameras: dim(['Leica'], true),
        locations: dim(['Rome'], true),
      })
    );
    expect(result.selectedTags).toEqual({ label: 'Tags', options: ['x'] });
    expect(result.selectedCameras).toEqual({ label: 'Camera', options: ['Leica'] });
    expect(result.selectedLocations).toEqual({ label: 'Location', options: ['Rome'] });
  });

  it('surfaces a lens-names dropdown when lenses are filterable', () => {
    const result = toCollectionDimensions(options({ lenses: dim(['35mm'], true) }));
    expect(result.selectedLenses).toEqual({ label: 'Lens', options: ['35mm'] });
    expect(result.selectedLensTypes).toBeUndefined();
  });

  it('adds a lens-types dropdown (with display labels) when lens types are present', () => {
    const result = toCollectionDimensions(
      options({
        lenses: dim(['35mm'], true),
        lensTypes: { values: ['wide', 'telephoto'], filterable: true },
      })
    );
    expect(result.selectedLenses).toEqual({ label: 'Lens', options: ['35mm'] });
    expect(result.selectedLensTypes).toEqual({
      label: 'Lens type',
      options: ['wide', 'telephoto'],
      optionLabels: { wide: 'Wide', normal: 'Normal', telephoto: 'Telephoto' },
    });
  });

  it('still surfaces the lens dropdowns when only lens types are filterable', () => {
    const result = toCollectionDimensions(
      options({ lensTypes: { values: ['normal'], filterable: true } })
    );
    expect(result.selectedLenses).toEqual({ label: 'Lens', options: [] });
    expect(result.selectedLensTypes).toMatchObject({ label: 'Lens type', options: ['normal'] });
  });
});

describe('getClickEligibility', () => {
  const base = {
    contentType: 'IMAGE' as const,
    isReorderMode: false,
    hasSlug: undefined as string | undefined,
    onImageClick: undefined as ((id: number) => void) | undefined,
    enableFullScreenView: false,
    onFullScreenImageClick: undefined,
  };

  it('TEXT content is never clickable nor a slug nav', () => {
    expect(getClickEligibility({ ...base, contentType: 'TEXT' })).toEqual({
      hasClickHandler: false,
      isSlugNav: false,
    });
  });

  it('reorder mode disables both eligibility flags', () => {
    expect(
      getClickEligibility({ ...base, isReorderMode: true, onImageClick: jest.fn(), hasSlug: 's' })
    ).toEqual({ hasClickHandler: false, isSlugNav: false });
  });

  it('a slug with no onImageClick navigates and is clickable', () => {
    expect(
      getClickEligibility({ ...base, contentType: 'COLLECTION', hasSlug: 'dolomites' })
    ).toEqual({ hasClickHandler: true, isSlugNav: true });
  });

  it('onImageClick beats slug nav (handler, not href)', () => {
    expect(
      getClickEligibility({
        ...base,
        contentType: 'COLLECTION',
        hasSlug: 'dolomites',
        onImageClick: jest.fn(),
      })
    ).toEqual({ hasClickHandler: true, isSlugNav: false });
  });

  it('onImageClick alone makes an item clickable but not slug nav', () => {
    expect(getClickEligibility({ ...base, onImageClick: jest.fn() })).toEqual({
      hasClickHandler: true,
      isSlugNav: false,
    });
  });

  it('fullscreen view makes an image clickable without a slug or onImageClick', () => {
    expect(
      getClickEligibility({
        ...base,
        enableFullScreenView: true,
        onFullScreenImageClick: jest.fn(),
      })
    ).toEqual({ hasClickHandler: true, isSlugNav: false });
  });

  it('an image with no slug, no handler, and no fullscreen is not clickable', () => {
    expect(getClickEligibility(base)).toEqual({ hasClickHandler: false, isSlugNav: false });
  });

  it('an empty-string slug is treated as set for hasClickHandler but falsy for slug nav', () => {
    // hasSlug !== undefined → true (clickable); !!hasSlug → false (no nav). Mirrors `_hasSlug` use.
    expect(getClickEligibility({ ...base, hasSlug: '' })).toEqual({
      hasClickHandler: true,
      isSlugNav: false,
    });
  });
});
