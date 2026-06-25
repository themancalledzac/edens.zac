/**
 * Tests for the `canSelect` capability gate — the single predicate that decides
 * whether a viewer may add/remove an image from their personal Selects in a
 * given collection. Any gallery_access grant (or admin) gates Selects.
 */

import { type MeResponse } from '@/app/types/Auth';
import { canSelect } from '@/app/utils/canSelect';

const admin: MeResponse = {
  email: 'admin@example.com',
  role: 'ADMIN',
  mfaSatisfied: true,
  galleries: [],
};

const client: MeResponse = {
  email: 'client@example.com',
  role: 'CLIENT',
  mfaSatisfied: false,
  galleries: [{ collectionId: 7, canDownload: true, canTag: false }],
};

describe('canSelect', () => {
  it('is true for an admin on any collection', () => {
    expect(canSelect(admin, 999)).toBe(true);
  });

  it('is true for a client with a grant on that collection', () => {
    expect(canSelect(client, 7)).toBe(true);
  });

  it('is false for a client without a grant on that collection', () => {
    expect(canSelect(client, 8)).toBe(false);
  });

  it('is false for an anonymous viewer', () => {
    expect(canSelect(null, 7)).toBe(false);
  });
});
