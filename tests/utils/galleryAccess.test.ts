/**
 * Tests for the gallery-access capability helpers — the single source of
 * "what can this viewer do here" consumed by the Selects and Rating features.
 */

import { type MeResponse } from '@/app/types/Auth';
import { findGrant, isAdmin, isClientOfCollection } from '@/app/utils/galleryAccess';

const admin: MeResponse = {
  email: 'admin@example.com',
  role: 'ADMIN',
  mfaSatisfied: true,
  galleries: [],
};

const clientGrant = { collectionId: 7, canDownload: true, canTag: false };

const client: MeResponse = {
  email: 'client@example.com',
  role: 'CLIENT',
  mfaSatisfied: false,
  galleries: [clientGrant],
};

describe('isAdmin', () => {
  it('is true for an ADMIN principal', () => {
    expect(isAdmin(admin)).toBe(true);
  });

  it('is false for a CLIENT principal', () => {
    expect(isAdmin(client)).toBe(false);
  });

  it('is false for an anonymous (null) principal', () => {
    expect(isAdmin(null)).toBe(false);
  });
});

describe('findGrant', () => {
  it('returns the grant for a collection the client has access to', () => {
    expect(findGrant(client, 7)).toEqual(clientGrant);
  });

  it('returns undefined for a collection the client lacks', () => {
    expect(findGrant(client, 99)).toBeUndefined();
  });

  it('returns undefined for an anonymous principal', () => {
    expect(findGrant(null, 7)).toBeUndefined();
  });
});

describe('isClientOfCollection', () => {
  it('is true for an admin on any collection', () => {
    expect(isClientOfCollection(admin, 123)).toBe(true);
  });

  it('is true for a client with a grant for that collection', () => {
    expect(isClientOfCollection(client, 7)).toBe(true);
  });

  it('is false for a client without a grant for that collection', () => {
    expect(isClientOfCollection(client, 99)).toBe(false);
  });

  it('is false for an anonymous principal', () => {
    expect(isClientOfCollection(null, 7)).toBe(false);
  });
});
