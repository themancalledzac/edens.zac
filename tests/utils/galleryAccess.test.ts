/**
 * Tests for the gallery-access capability helpers — the single source of
 * "what can this viewer do here" consumed by the Selects and Rating features.
 */

import { type MeResponse } from '@/app/types/Auth';
import { CollectionType } from '@/app/types/Collection';
import {
  canDownloadCollection,
  findMembership,
  isClientOfCollection,
} from '@/app/utils/galleryAccess';

const clientMembership = { collectionId: 7, role: 'CLIENT' as const };

const clientMe: MeResponse = {
  email: 'client@example.com',
  isAdmin: false,
  mfaSatisfied: false,
  galleries: [clientMembership],
};

const generalMe: MeResponse = {
  email: 'general@example.com',
  isAdmin: false,
  mfaSatisfied: false,
  galleries: [{ collectionId: 7, role: 'GENERAL' }],
};

describe('findMembership', () => {
  it('returns the membership for a collection the user has', () => {
    expect(findMembership(clientMe, 7)).toEqual(clientMembership);
  });

  it('returns undefined for a collection the user lacks', () => {
    expect(findMembership(clientMe, 99)).toBeUndefined();
  });

  it('returns undefined for an anonymous principal', () => {
    expect(findMembership(null, 7)).toBeUndefined();
  });
});

describe('isClientOfCollection', () => {
  it('is true for editMode (admin perimeter) on any collection', () => {
    expect(isClientOfCollection(null, 123, true)).toBe(true);
    expect(isClientOfCollection(clientMe, 99, true)).toBe(true);
  });

  it('is true for a user with a CLIENT membership for that collection', () => {
    expect(isClientOfCollection(clientMe, 7, false)).toBe(true);
  });

  it('is false for a user with only a GENERAL membership', () => {
    expect(isClientOfCollection(generalMe, 7, false)).toBe(false);
  });

  it('is false for a user without a membership for that collection', () => {
    expect(isClientOfCollection(clientMe, 99, false)).toBe(false);
  });

  it('is false for an anonymous principal without editMode', () => {
    expect(isClientOfCollection(null, 7, false)).toBe(false);
  });
});

describe('canDownloadCollection', () => {
  it('is true on a CLIENT_GALLERY even for an anonymous viewer (password-cookie client path)', () => {
    expect(canDownloadCollection(null, { id: 7, type: CollectionType.CLIENT_GALLERY })).toBe(true);
  });

  it('is true for a logged-in CLIENT on a non-CLIENT_GALLERY collection (the prod bug)', () => {
    // A CLIENT grant on a PORTFOLIO must surface downloads — backend authorizes by role, not type.
    expect(canDownloadCollection(clientMe, { id: 7, type: CollectionType.PORTFOLIO })).toBe(true);
  });

  it('is false for an anonymous viewer on a non-CLIENT_GALLERY collection', () => {
    expect(canDownloadCollection(null, { id: 7, type: CollectionType.PORTFOLIO })).toBe(false);
  });

  it('is false for a GENERAL member on a non-CLIENT_GALLERY collection', () => {
    expect(canDownloadCollection(generalMe, { id: 7, type: CollectionType.PORTFOLIO })).toBe(false);
  });

  it('is false for a CLIENT of a different collection', () => {
    expect(canDownloadCollection(clientMe, { id: 99, type: CollectionType.PORTFOLIO })).toBe(false);
  });

  it('is false for null/undefined collection', () => {
    expect(canDownloadCollection(clientMe, null)).toBe(false);
    expect(canDownloadCollection(clientMe, undefined)).toBe(false);
  });
});
