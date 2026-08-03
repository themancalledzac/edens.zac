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
  showHighlyRated: false,
  showDateSort: false,
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

  it('maps cameras and locations with their labels', () => {
    const result = toCollectionDimensions(
      options({
        cameras: dim(['Leica'], true),
        locations: dim(['Rome'], true),
      })
    );
    expect(result.selectedCameras).toEqual({ label: 'Camera', options: ['Leica'] });
    expect(result.selectedLocations).toEqual({ label: 'Location', options: ['Rome'] });
  });

  it('surfaces a lens-names dropdown when lenses are filterable', () => {
    const result = toCollectionDimensions(options({ lenses: dim(['35mm'], true) }));
    expect(result.selectedLenses).toEqual({ label: 'Lens', options: ['35mm'] });
  });

  it('never surfaces a Tags dropdown on collections', () => {
    const dims = toCollectionDimensions({
      tags: { values: ['sunset', 'ridge'], filterable: true },
      people: { values: [], filterable: true },
      cameras: { values: [], filterable: true },
      lenses: { values: [], filterable: true },
      locations: { values: [], filterable: true },
      showHighlyRated: false,
      showDateSort: false,
    });
    expect(dims.selectedTags).toBeUndefined();
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
    currentCollectionId: undefined as number | undefined,
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

  it('slug nav beats onImageClick (a collection card navigates, it is not a download target)', () => {
    expect(
      getClickEligibility({
        ...base,
        contentType: 'COLLECTION',
        hasSlug: 'dolomites',
        onImageClick: jest.fn(),
      })
    ).toEqual({ hasClickHandler: true, isSlugNav: true });
  });

  it('slug nav beats onImageClick for a CONVERTED card too (contentType IMAGE + slug)', () => {
    // Post-conversion cards arrive as contentType 'IMAGE'; the slug is the discriminant.
    expect(
      getClickEligibility({
        ...base,
        contentType: 'IMAGE',
        hasSlug: 'dolomites',
        onImageClick: jest.fn(),
      })
    ).toEqual({ hasClickHandler: true, isSlugNav: true });
  });

  it('on the MANAGE grid onImageClick beats slug nav (the handler is the manage router)', () => {
    // EditModeLayer sets onImageClick grid-wide AND threads currentCollectionId. There the
    // handler pushes manageHref(childSlug), so an admin drill-down stays in manage mode.
    expect(
      getClickEligibility({
        ...base,
        contentType: 'COLLECTION',
        hasSlug: 'dolomites',
        onImageClick: jest.fn(),
        currentCollectionId: 42,
      })
    ).toEqual({ hasClickHandler: true, isSlugNav: false });
  });

  it('on the MANAGE grid without onImageClick (reorder pending / not ready) slug nav still applies', () => {
    expect(
      getClickEligibility({
        ...base,
        contentType: 'COLLECTION',
        hasSlug: 'dolomites',
        currentCollectionId: 42,
      })
    ).toEqual({ hasClickHandler: true, isSlugNav: true });
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
