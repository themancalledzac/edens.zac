/**
 * Unit tests for buildUpdatePayload's date clear-flag derivation.
 *
 * When a previously-set collectionDate / collectionEndDate is removed, the payload must
 * carry `clearCollectionDate` / `clearCollectionEndDate: true` (and NOT the value key)
 * rather than sending `null` — this is the wire contract the backend expects. `''` is
 * treated as equivalent to `null` (clearing).
 */

import { buildUpdatePayload } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { type CollectionModel, type CollectionUpdateRequest } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'test-collection',
    title: 'Test Collection',
    description: '',
    isClient: false,
    isBlog: false,
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    rowsWide: 4,
    content: [],
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeForm(overrides: Partial<CollectionUpdateRequest> = {}): CollectionUpdateRequest {
  return {
    id: 1,
    ...overrides,
  };
}

describe('buildUpdatePayload — date clear-flag derivation', () => {
  describe('collectionDate', () => {
    it('sends the raw value (no clear flag) when set from an unset original', () => {
      const original = makeCollection({ collectionDate: undefined });
      const form = makeForm({ collectionDate: '2026-03-07' });

      const payload = buildUpdatePayload(form, original);

      expect(payload.collectionDate).toBe('2026-03-07');
      expect(payload).not.toHaveProperty('clearCollectionDate');
    });

    it('sends clearCollectionDate:true (and no value key) when a set date is cleared to null', () => {
      const original = makeCollection({ collectionDate: '2026-01-01' });
      const form = makeForm({ collectionDate: null });

      const payload = buildUpdatePayload(form, original);

      expect(payload.clearCollectionDate).toBe(true);
      expect(payload).not.toHaveProperty('collectionDate');
    });

    it("treats '' as null (clearing) when a set date is cleared to an empty string", () => {
      const original = makeCollection({ collectionDate: '2026-01-01' });
      const form = makeForm({ collectionDate: '' });

      const payload = buildUpdatePayload(form, original);

      expect(payload.clearCollectionDate).toBe(true);
      expect(payload).not.toHaveProperty('collectionDate');
    });

    it('omits both the value key and the clear flag when unchanged', () => {
      const original = makeCollection({ collectionDate: '2026-01-01' });
      const form = makeForm({ collectionDate: '2026-01-01' });

      const payload = buildUpdatePayload(form, original);

      expect(payload).not.toHaveProperty('collectionDate');
      expect(payload).not.toHaveProperty('clearCollectionDate');
    });

    it('sends the new value (no clear flag) when a set date is moved to a different date', () => {
      const original = makeCollection({ collectionDate: '2026-01-01' });
      const form = makeForm({ collectionDate: '2026-04-20' });

      const payload = buildUpdatePayload(form, original);

      expect(payload.collectionDate).toBe('2026-04-20');
      expect(payload).not.toHaveProperty('clearCollectionDate');
    });
  });

  describe('collectionEndDate', () => {
    it('sends the raw value (no clear flag) when set from an unset original', () => {
      const original = makeCollection({ collectionEndDate: undefined });
      const form = makeForm({ collectionEndDate: '2026-03-07' });

      const payload = buildUpdatePayload(form, original);

      expect(payload.collectionEndDate).toBe('2026-03-07');
      expect(payload).not.toHaveProperty('clearCollectionEndDate');
    });

    it('sends clearCollectionEndDate:true (and no value key) when a set end date is cleared to null', () => {
      const original = makeCollection({ collectionEndDate: '2026-01-05' });
      const form = makeForm({ collectionEndDate: null });

      const payload = buildUpdatePayload(form, original);

      expect(payload.clearCollectionEndDate).toBe(true);
      expect(payload).not.toHaveProperty('collectionEndDate');
    });

    it("treats '' as null (clearing) when a set end date is cleared to an empty string", () => {
      const original = makeCollection({ collectionEndDate: '2026-01-05' });
      const form = makeForm({ collectionEndDate: '' });

      const payload = buildUpdatePayload(form, original);

      expect(payload.clearCollectionEndDate).toBe(true);
      expect(payload).not.toHaveProperty('collectionEndDate');
    });

    it('omits both the value key and the clear flag when unchanged', () => {
      const original = makeCollection({ collectionEndDate: '2026-01-05' });
      const form = makeForm({ collectionEndDate: '2026-01-05' });

      const payload = buildUpdatePayload(form, original);

      expect(payload).not.toHaveProperty('collectionEndDate');
      expect(payload).not.toHaveProperty('clearCollectionEndDate');
    });

    it('is left untouched when the form field is absent (undefined)', () => {
      const original = makeCollection({ collectionEndDate: '2026-01-05' });
      const form = makeForm({});

      const payload = buildUpdatePayload(form, original);

      expect(payload).not.toHaveProperty('collectionEndDate');
      expect(payload).not.toHaveProperty('clearCollectionEndDate');
    });

    it('sends the new value (no clear flag) when a set date is moved to a different date', () => {
      // The set -> different-set edge: only the from-unset branch was covered, so a mutant
      // that dropped the value on an edit-in-place survived.
      const original = makeCollection({ collectionEndDate: '2026-01-05' });
      const form = makeForm({ collectionEndDate: '2026-02-09' });

      const payload = buildUpdatePayload(form, original);

      expect(payload.collectionEndDate).toBe('2026-02-09');
      expect(payload).not.toHaveProperty('clearCollectionEndDate');
    });
  });
});

describe('buildUpdatePayload — kind flags', () => {
  it('sends isClient when the admin turns a collection into a client gallery', () => {
    const result = buildUpdatePayload(
      makeForm({ isClient: true, isBlog: false }),
      makeCollection({ isClient: false, isBlog: false })
    );
    expect(result.isClient).toBe(true);
  });

  it('sends isClient: false when the admin demotes a client gallery', () => {
    const result = buildUpdatePayload(
      makeForm({ isClient: false, isBlog: false }),
      makeCollection({ isClient: true, isBlog: false })
    );
    expect(result.isClient).toBe(false);
  });

  it('omits both flags on a metadata-only save', () => {
    const result = buildUpdatePayload(
      makeForm({ isClient: false, isBlog: false, title: 'Renamed' }),
      makeCollection({ isClient: false, isBlog: false })
    );
    expect(result).toEqual({ id: 1, title: 'Renamed' });
  });

  it('sends isBlog when the admin turns a collection into a blog', () => {
    const result = buildUpdatePayload(
      makeForm({ isClient: false, isBlog: true }),
      makeCollection({ isClient: false, isBlog: false })
    );
    expect(result.isBlog).toBe(true);
  });
});
