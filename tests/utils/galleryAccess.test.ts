/**
 * Tests for the gallery-access capability helpers — the single source of
 * "what can this viewer do here" consumed by the Selects and Rating features.
 */

import { type MeResponse } from '@/app/types/Auth';
import { findMembership, isClientOfCollection } from '@/app/utils/galleryAccess';

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
