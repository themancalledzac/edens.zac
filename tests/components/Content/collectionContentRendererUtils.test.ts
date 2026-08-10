/**
 * Unit tests for the pure helpers extracted from {@link CollectionContentRenderer}.
 */

import { type KeyboardEvent } from 'react';

import {
  activatableProps,
  getClickEligibility,
  toCollectionDimensions,
} from '@/app/components/Content/collectionContentRendererUtils';
import { type CollectionInfoOptions } from '@/app/components/ContentCollection/CollectionFilterContext';

const dim = (values: readonly string[], filterable: boolean) => ({ values, filterable });

const options = (overrides: Partial<CollectionInfoOptions> = {}): CollectionInfoOptions => ({
  people: dim([], false),
  cameras: dim([], false),
  lenses: dim([], false),
  locations: dim([], false),
  dates: dim([], false),
  showHighlyRated: false,
  showDateSort: false,
  showHiddenToggle: false,
  hiddenCount: 0,
  ...overrides,
});

describe('toCollectionDimensions', () => {
  it('returns no dimensions when nothing is filterable', () => {
    expect(toCollectionDimensions(options())).toEqual({});
  });

  it('skips a dimension that is filterable but has no values', () => {
    expect(toCollectionDimensions(options({ locations: dim([], true) }))).toEqual({});
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

  it('surfaces dates with human labels when filterable', () => {
    const dims = toCollectionDimensions({
      people: { values: [], filterable: true },
      cameras: { values: [], filterable: true },
      lenses: { values: [], filterable: true },
      locations: { values: [], filterable: true },
      dates: { values: ['2026-07-20', '2026-07-21'], filterable: true },
      showHighlyRated: false,
      showDateSort: false,
      showHiddenToggle: false,
      hiddenCount: 0,
    });
    expect(dims.selectedDates).toEqual({
      label: 'Date',
      options: ['2026-07-20', '2026-07-21'],
      optionLabels: { '2026-07-20': 'Jul 20', '2026-07-21': 'Jul 21' },
    });
  });

  it('omits dates when not filterable', () => {
    const dims = toCollectionDimensions({
      people: { values: [], filterable: true },
      cameras: { values: [], filterable: true },
      lenses: { values: [], filterable: true },
      locations: { values: [], filterable: true },
      dates: { values: ['2026-07-20'], filterable: false },
      showHighlyRated: false,
      showDateSort: false,
      showHiddenToggle: false,
      hiddenCount: 0,
    });
    expect(dims.selectedDates).toBeUndefined();
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

/**
 * The keyboard contract for a tile. It was only ever covered through the rendered component, which
 * left the two least visible rules unpinned: Space must suppress the page scroll, and a held key
 * must not re-fire. Both are invisible today because every `onActivate` happens to be idempotent.
 */
describe('activatableProps', () => {
  const keyEvent = (key: string, repeat = false) => {
    const preventDefault = jest.fn();
    const event = { key, repeat, preventDefault } as unknown as KeyboardEvent<HTMLElement>;
    return { event, preventDefault };
  };

  it('returns nothing for an inert tile, so it advertises no role and takes no tab stop', () => {
    expect(activatableProps(false, jest.fn())).toEqual({});
  });

  it('exposes a button role, a tab stop and the click handler when active', () => {
    const onActivate = jest.fn();
    const props = activatableProps(true, onActivate);

    expect(props.role).toBe('button');
    expect(props.tabIndex).toBe(0);
    expect(props.onClick).toBe(onActivate);
  });

  it.each([
    ['Enter', 'Enter'],
    ['Space', ' '],
  ])('activates on %s', (_name, key) => {
    const onActivate = jest.fn();
    const { event } = keyEvent(key);

    activatableProps(true, onActivate).onKeyDown?.(event);

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('prevents the default on Space so the page does not scroll out from under the tile', () => {
    const { event, preventDefault } = keyEvent(' ');

    activatableProps(true, jest.fn()).onKeyDown?.(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it.each(['a', 'Tab', 'Escape', 'ArrowRight'])(
    'ignores %s and leaves its default behaviour intact',
    key => {
      const onActivate = jest.fn();
      const { event, preventDefault } = keyEvent(key);

      activatableProps(true, onActivate).onKeyDown?.(event);

      expect(onActivate).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['Enter', 'Enter'],
    ['Space', ' '],
  ])('does not re-activate on an auto-repeat of a held %s', (_name, key) => {
    const onActivate = jest.fn();
    const props = activatableProps(true, onActivate);

    props.onKeyDown?.(keyEvent(key).event);
    props.onKeyDown?.(keyEvent(key, true).event);
    props.onKeyDown?.(keyEvent(key, true).event);

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('keeps suppressing the scroll on every repeat of a held Space', () => {
    const { event, preventDefault } = keyEvent(' ', true);

    activatableProps(true, jest.fn()).onKeyDown?.(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
