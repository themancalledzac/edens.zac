/**
 * Tests for the gallery-access capability helpers — the single source of
 * "what can this viewer do here" consumed by the Selects and Rating features.
 */

import { type CollectionRole, type MeResponse } from '@/app/types/Auth';
import {
  canDownloadCollection,
  findMembership,
  hasRoleAtLeast,
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

const collaboratorMe: MeResponse = {
  email: 'collaborator@example.com',
  isAdmin: false,
  mfaSatisfied: false,
  galleries: [{ collectionId: 7, role: 'COLLABORATOR' }],
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

  it('is true for a user with a COLLABORATOR membership for that collection (outranks CLIENT)', () => {
    expect(isClientOfCollection(collaboratorMe, 7, false)).toBe(true);
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
  it('is true for a logged-in CLIENT of the collection (role grant, any collection kind)', () => {
    expect(canDownloadCollection(clientMe, { id: 7 })).toBe(true);
  });

  it('is true for a logged-in COLLABORATOR of the collection (outranks CLIENT)', () => {
    expect(canDownloadCollection(collaboratorMe, { id: 7 })).toBe(true);
  });

  it('is false for an anonymous viewer with no role grant and no cookie proof', () => {
    expect(canDownloadCollection(null, { id: 7 })).toBe(false);
  });

  it('is true for an anonymous viewer on a protected client gallery that returned content', () => {
    // Content present on a protected client gallery proves the password cookie validated —
    // the backend nulls `content` otherwise. /api/auth/me never sees that cookie.
    expect(
      canDownloadCollection(null, {
        id: 7,
        isClient: true,
        isPasswordProtected: true,
        content: [],
      })
    ).toBe(true);
  });

  it('is false for an anonymous viewer on a protected client gallery with content withheld', () => {
    expect(canDownloadCollection(null, { id: 7, isClient: true, isPasswordProtected: true })).toBe(
      false
    );
  });

  it('is false for an anonymous viewer on an UNprotected client gallery', () => {
    // No password means no cookie to prove; downloads there need a real role grant.
    expect(
      canDownloadCollection(null, {
        id: 7,
        isClient: true,
        isPasswordProtected: false,
        content: [],
      })
    ).toBe(false);
  });

  it('is false for an anonymous viewer on a protected NON-client collection with content', () => {
    expect(
      canDownloadCollection(null, {
        id: 7,
        isClient: false,
        isPasswordProtected: true,
        content: [],
      })
    ).toBe(false);
  });

  it('is false for a GENERAL member of the collection', () => {
    expect(canDownloadCollection(generalMe, { id: 7 })).toBe(false);
  });

  it('is false for a CLIENT of a different collection', () => {
    expect(canDownloadCollection(clientMe, { id: 99 })).toBe(false);
  });

  it('is false for null/undefined collection', () => {
    expect(canDownloadCollection(clientMe, null)).toBe(false);
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicitly testing undefined input
    expect(canDownloadCollection(clientMe, undefined)).toBe(false);
  });
});

describe('hasRoleAtLeast', () => {
  it.each<[CollectionRole, CollectionRole, boolean]>([
    // Ladder order: GENERAL < CLIENT < COLLABORATOR.
    ['GENERAL', 'CLIENT', false],
    ['CLIENT', 'COLLABORATOR', false],
    ['GENERAL', 'COLLABORATOR', false],
    ['CLIENT', 'GENERAL', true],
    ['COLLABORATOR', 'GENERAL', true],
    ['COLLABORATOR', 'CLIENT', true],
    // Reflexive: a role always satisfies itself as the minimum.
    ['GENERAL', 'GENERAL', true],
    ['CLIENT', 'CLIENT', true],
    ['COLLABORATOR', 'COLLABORATOR', true],
  ])('hasRoleAtLeast(%s, %s) === %s', (role, minimum, expected) => {
    expect(hasRoleAtLeast(role, minimum)).toBe(expected);
  });

  it('is false for an undefined role', () => {
    expect(hasRoleAtLeast(undefined, 'GENERAL')).toBe(false);
  });
});
