/** @jest-environment node */
/**
 * `loadUserSpace` — the line between "nothing here" and "we don't know", in both modes.
 *
 * Every read backing this view used to collapse failure into a value the UI then presented as
 * fact:
 *
 * - the page read caught everything to `null`, which the detail page renders as
 *   "This user has no galleries yet."
 * - saves and follows caught everything to `[]`, which renders as "This user has not saved any
 *   images yet." on the admin path and "You have not saved any images yet." on the owner's own.
 *
 * The page read now narrows to a genuine 404 and rethrows the rest; saves and follows stay
 * fail-soft in BOTH modes (the admin endpoints are not deployed yet, and a missing bookmark list
 * should never take down `/user`) but report the failure as `unavailableLabel`, in the second
 * person for the owner and the third for an admin looking in.
 *
 * A failed follows read is a PARTIAL failure of the merged Collections section: the admin-granted
 * half still renders and is still counted, and the copy says the list may be incomplete.
 *
 * `@/app/lib/api/core` is deliberately NOT mocked — the narrowing is an `instanceof ApiError`
 * check, so the real class has to be the one being thrown.
 */

jest.mock('@/app/lib/api/collections', () => ({ getAllCollections: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({
  getUserPage: jest.fn(),
  listSavedImagesServer: jest.fn(),
  listFollowedCollectionIdsServer: jest.fn(),
}));
jest.mock('@/app/lib/api/users', () => ({
  getUserPageById: jest.fn(),
  listSavedImagesByUserServer: jest.fn(),
  listFollowedCollectionIdsByUserServer: jest.fn(),
}));

import { loadUserSpace } from '@/app/components/UserSpace/userSpaceData';
import { getAllCollections } from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import {
  getUserPage,
  listFollowedCollectionIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';
import {
  getUserPageById,
  listFollowedCollectionIdsByUserServer,
  listSavedImagesByUserServer,
} from '@/app/lib/api/users';

const mockGetAllCollections = getAllCollections as jest.Mock;
const mockGetUserPage = getUserPage as jest.Mock;
const mockGetUserPageById = getUserPageById as jest.Mock;
const mockListSavedSelf = listSavedImagesServer as jest.Mock;
const mockListFollowsSelf = listFollowedCollectionIdsServer as jest.Mock;
const mockListSavedByUser = listSavedImagesByUserServer as jest.Mock;
const mockListFollowsByUser = listFollowedCollectionIdsByUserServer as jest.Mock;

const userPage = { slug: 'user', title: 'Their Space', content: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAllCollections.mockResolvedValue([]);
  mockGetUserPage.mockResolvedValue(userPage);
  mockGetUserPageById.mockResolvedValue(userPage);
  mockListSavedSelf.mockResolvedValue({ ok: true, items: [] });
  mockListFollowsSelf.mockResolvedValue({ ok: true, items: [] });
  mockListSavedByUser.mockResolvedValue({ ok: true, items: [] });
  mockListFollowsByUser.mockResolvedValue({ ok: true, items: [] });
});

const loadAdmin = () => loadUserSpace({ mode: 'admin', userId: 5 });

/**
 * The collection catalog is the one read that serves a single section, and it is the expensive one
 * (~0.5s / ~57KB against the local backend). It hydrates the followed half of the merged
 * Collections list, so it is read on Collections and skipped on the two sections that render no
 * collections.
 *
 * The pair below is what makes skipping it safe: the Collections badge counts the union of the
 * granted blocks and the follows id list, never the hydrated array. Derive it from `content`
 * instead and a section that skipped the catalog silently badges only the granted half.
 *
 * Admin mode. The self-mode twin is `userSpaceData.selfCatalog.test.ts`.
 */
describe('loadUserSpace — the catalog read is scoped to the section that renders collections', () => {
  it('skips the catalog entirely on the sections that render no collections', async () => {
    for (const tab of ['images', 'saved'] as const) {
      jest.clearAllMocks();
      mockGetAllCollections.mockResolvedValue([]);
      mockGetUserPageById.mockResolvedValue(userPage);
      mockListSavedByUser.mockResolvedValue({ ok: true, items: [] });
      mockListFollowsByUser.mockResolvedValue({ ok: true, items: [7] });

      await loadUserSpace({ mode: 'admin', userId: 5 }, tab);

      expect(mockGetAllCollections).not.toHaveBeenCalled();
    }
  });

  it('reads the catalog on the Collections section and hydrates the followed half into it', async () => {
    mockListFollowsByUser.mockResolvedValue({ ok: true, items: [7] });
    mockGetAllCollections.mockResolvedValue([{ id: 7, slug: 'seven', title: 'Seven' }]);

    const data = await loadUserSpace({ mode: 'admin', userId: 5 }, 'collections');

    expect(mockGetAllCollections).toHaveBeenCalled();
    expect(data?.sections.collections.content).toHaveLength(1);
  });

  /** The claim skipping the catalog could quietly break. */
  it('still counts followed collections on a section that never fetched them', async () => {
    mockListFollowsByUser.mockResolvedValue({ ok: true, items: [7, 9, 11] });

    const data = await loadUserSpace({ mode: 'admin', userId: 5 }, 'images');

    expect(data?.sections.collections.content).toHaveLength(0);
    expect(data?.sections.collections.count).toBe(3);
  });

  /**
   * A failed follows read no longer blanks the badge. The granted half was read and is still
   * counted; the section says separately that the list may be incomplete. The Following section
   * this replaced went to an undefined count, because it had nothing else left to report.
   */
  it('keeps counting the granted half when the follows read itself failed', async () => {
    mockGetUserPageById.mockResolvedValue({
      ...userPage,
      content: [{ id: 100, contentType: 'COLLECTION', referencedCollectionId: 1, slug: 'one' }],
    });
    mockListFollowsByUser.mockResolvedValue({ ok: false });

    const data = await loadUserSpace({ mode: 'admin', userId: 5 }, 'collections');

    expect(data?.sections.collections.count).toBe(1);
    expect(data?.sections.collections.unavailableLabel).toContain('may be incomplete');
  });
});

describe('loadUserSpace — the galleries read tells 404 apart from failure', () => {
  it('resolves null on a genuine 404, which the page renders as the empty state', async () => {
    mockGetUserPageById.mockRejectedValue(new ApiError('Not Found', 404));

    await expect(loadAdmin()).resolves.toBeNull();
  });

  it('resolves null on an empty body', async () => {
    mockGetUserPageById.mockResolvedValue(null);

    await expect(loadAdmin()).resolves.toBeNull();
  });

  /**
   * The regression. A 500 used to arrive at the page as `null`, and the page said the user had no
   * galleries — a confident claim about data nobody managed to read.
   */
  it('rethrows a 500 to the error boundary instead of claiming the user has no galleries', async () => {
    mockGetUserPageById.mockRejectedValue(new ApiError('Server Error', 500));

    await expect(loadAdmin()).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });

  it('rethrows a lapsed admin session (401)', async () => {
    mockGetUserPageById.mockRejectedValue(new ApiError('Unauthorized', 401));

    await expect(loadAdmin()).rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });

  it('rethrows a non-ApiError failure such as a network drop', async () => {
    mockGetUserPageById.mockRejectedValue(new TypeError('fetch failed'));

    await expect(loadAdmin()).rejects.toThrow('fetch failed');
  });
});

describe('loadUserSpace — a failed saves/follows read says unavailable, never "none"', () => {
  it('marks Saved unavailable and drops the "has not saved" claim', async () => {
    mockListSavedByUser.mockResolvedValue({ ok: false });

    const data = await loadAdmin();

    expect(data?.sections.saved.unavailableLabel).toBe('Saved images are unavailable right now.');
  });

  /**
   * A failed follows read is a partial failure of Collections, not a total one. The granted half
   * still renders, so the copy says the list may be incomplete instead of claiming the whole
   * section is unavailable — which would be false about content the reader can see.
   */
  it('marks Collections incomplete and keeps the granted half it did read', async () => {
    mockGetUserPageById.mockResolvedValue({
      ...userPage,
      content: [{ id: 100, contentType: 'COLLECTION', referencedCollectionId: 1, slug: 'one' }],
    });
    mockListFollowsByUser.mockResolvedValue({ ok: false });

    const data = await loadAdmin();

    expect(data?.sections.collections.unavailableLabel).toBe(
      'Followed collections are unavailable right now, so this list may be incomplete.'
    );
    expect(data?.sections.collections.content).toHaveLength(1);
  });

  it('does not take the page down when both reads fail — the space still loads', async () => {
    mockListSavedByUser.mockResolvedValue({ ok: false });
    mockListFollowsByUser.mockResolvedValue({ ok: false });

    const data = await loadAdmin();

    expect(data).not.toBeNull();
    expect(data?.sections.images.unavailableLabel).toBeUndefined();
  });

  it('leaves a section that loaded alone when only its neighbour failed', async () => {
    mockListSavedByUser.mockResolvedValue({ ok: false });

    const data = await loadAdmin();

    expect(data?.sections.collections.unavailableLabel).toBeUndefined();
  });

  /**
   * The two modes differ in the PERSON of the copy and in nothing else — same nouns, same verb,
   * same tense. The follows-failure copy used to say "Following information is unavailable", which
   * named a different thing from its own self twin's "Your followed collections"; the drift is what
   * this pins down. Deriving one label from the other keeps the pair from drifting apart again.
   */
  it('names the same things its self-side twin names, differing only in the possessive', async () => {
    mockListSavedByUser.mockResolvedValue({ ok: false });
    mockListFollowsByUser.mockResolvedValue({ ok: false });
    mockListSavedSelf.mockResolvedValue({ ok: false });
    mockListFollowsSelf.mockResolvedValue({ ok: false });

    const admin = await loadAdmin();
    const self = await loadUserSpace('self');
    const inSecondPerson = (label: string | undefined) =>
      label && `Your ${label.charAt(0).toLowerCase()}${label.slice(1)}`;

    expect(admin?.sections.saved.unavailableLabel).toEqual(expect.any(String));
    expect(admin?.sections.collections.unavailableLabel).toEqual(expect.any(String));
    expect(inSecondPerson(admin?.sections.saved.unavailableLabel)).toBe(
      self?.sections.saved.unavailableLabel
    );
    expect(inSecondPerson(admin?.sections.collections.unavailableLabel)).toBe(
      self?.sections.collections.unavailableLabel
    );
  });
});

/**
 * The same defect on the owner's own page, which is the more-trafficked one: `/user` told the
 * OWNER "You have not saved any images yet." whenever the backend was down, because `personal.ts`
 * flattened every failure to `[]`. The copy stays in the second person — this is the viewer's own
 * space — but it no longer claims a fact nobody read.
 */
describe('loadUserSpace — a failed SELF read says unavailable, in the second person', () => {
  it('marks Saved unavailable with owner-facing copy', async () => {
    mockListSavedSelf.mockResolvedValue({ ok: false });

    const data = await loadUserSpace('self');

    expect(data?.sections.saved.unavailableLabel).toBe(
      'Your saved images are unavailable right now.'
    );
  });

  it('marks Collections incomplete with owner-facing copy', async () => {
    mockListFollowsSelf.mockResolvedValue({ ok: false });

    const data = await loadUserSpace('self');

    expect(data?.sections.collections.unavailableLabel).toBe(
      'Your followed collections are unavailable right now, so this list may be incomplete.'
    );
  });

  it('never says "This user" on the owner’s own page', async () => {
    mockListSavedSelf.mockResolvedValue({ ok: false });
    mockListFollowsSelf.mockResolvedValue({ ok: false });

    const data = await loadUserSpace('self');

    expect(data?.sections.saved.unavailableLabel).not.toMatch(/this user/i);
    expect(data?.sections.collections.unavailableLabel).not.toMatch(/this user/i);
  });

  it('does not take /user down when both personal reads fail', async () => {
    mockListSavedSelf.mockResolvedValue({ ok: false });
    mockListFollowsSelf.mockResolvedValue({ ok: false });

    const data = await loadUserSpace('self');

    expect(data).not.toBeNull();
    expect(data?.sections.images.unavailableLabel).toBeUndefined();
  });

  it('leaves the section that loaded alone when only its neighbour failed', async () => {
    mockListFollowsSelf.mockResolvedValue({ ok: false });

    const data = await loadUserSpace('self');

    expect(data?.sections.saved.unavailableLabel).toBeUndefined();
  });

  it('seeds no ids from a failed read, so nothing renders as saved or followed', async () => {
    mockListSavedSelf.mockResolvedValue({ ok: false });
    mockListFollowsSelf.mockResolvedValue({ ok: false });

    const data = await loadUserSpace('self');

    expect(data?.savedImageIds).toEqual([]);
    expect(data?.followedCollectionIds).toEqual([]);
  });
});

describe('loadUserSpace — a genuine empty keeps its existing copy', () => {
  it('leaves the owner’s Saved with the second-person empty claim, not the failure copy', async () => {
    const data = await loadUserSpace('self');

    expect(data?.sections.saved.unavailableLabel).toBeUndefined();
    expect(data?.sections.saved.emptyLabel).toBe('You have not saved any images yet.');
  });

  /**
   * The merged Collections section describes the list rather than the viewer, so its empty copy no
   * longer varies by person the way the Following section's did.
   */
  it('leaves the owner’s Collections with the empty claim, not the failure copy', async () => {
    const data = await loadUserSpace('self');

    expect(data?.sections.collections.unavailableLabel).toBeUndefined();
    expect(data?.sections.collections.emptyLabel).toBe('No collections yet.');
  });

  it('still surfaces the owner’s saved images when the read returned some', async () => {
    const image = { id: 4, contentType: 'IMAGE', imageUrl: 'https://cdn/4.jpg' };
    mockListSavedSelf.mockResolvedValue({ ok: true, items: [image] });

    const data = await loadUserSpace('self');

    expect(data?.sections.saved.content).toEqual([image]);
  });

  it('leaves Saved with the third-person empty claim and no unavailable label', async () => {
    const data = await loadAdmin();

    expect(data?.sections.saved.unavailableLabel).toBeUndefined();
    expect(data?.sections.saved.emptyLabel).toBe('This user has not saved any images yet.');
  });

  it('gives Collections the same empty claim in admin mode as on the owner’s own page', async () => {
    const admin = await loadAdmin();
    const self = await loadUserSpace('self');

    expect(admin?.sections.collections.unavailableLabel).toBeUndefined();
    expect(admin?.sections.collections.emptyLabel).toBe('No collections yet.');
    expect(admin?.sections.collections.emptyLabel).toBe(self?.sections.collections.emptyLabel);
  });

  it('still surfaces the images the read returned', async () => {
    const image = { id: 1, contentType: 'IMAGE', imageUrl: 'https://cdn/1.jpg' };
    mockListSavedByUser.mockResolvedValue({ ok: true, items: [image] });

    const data = await loadAdmin();

    expect(data?.sections.saved.content).toEqual([image]);
  });
});

describe('loadUserSpace — self mode uses the session-bound reads', () => {
  it('uses the session-bound reads, not the id-parameterized admin twins', async () => {
    await loadUserSpace('self');

    expect(mockGetUserPage).toHaveBeenCalled();
    expect(mockListSavedSelf).toHaveBeenCalled();
    expect(mockListFollowsSelf).toHaveBeenCalled();
    expect(mockGetUserPageById).not.toHaveBeenCalled();
    expect(mockListSavedByUser).not.toHaveBeenCalled();
    expect(mockListFollowsByUser).not.toHaveBeenCalled();
  });

  it('never marks a section unavailable when both reads loaded', async () => {
    const data = await loadUserSpace('self');

    expect(data?.sections.saved.unavailableLabel).toBeUndefined();
    expect(data?.sections.collections.unavailableLabel).toBeUndefined();
  });

  it('keeps the second-person empty copy', async () => {
    const data = await loadUserSpace('self');

    expect(data?.sections.saved.emptyLabel).toBe('You have not saved any images yet.');
    expect(data?.sections.images.emptyLabel).toBe('You are not tagged in any images yet.');
  });

  it('seeds the toggles from the viewer’s own ids', async () => {
    mockListSavedSelf.mockResolvedValue({ ok: true, items: [{ id: 3, contentType: 'IMAGE' }] });
    mockListFollowsSelf.mockResolvedValue({ ok: true, items: [7, 9] });

    const data = await loadUserSpace('self');

    expect(data?.savedImageIds).toEqual([3]);
    expect(data?.followedCollectionIds).toEqual([7, 9]);
  });

  it('seeds nothing in admin mode, so no target state reaches the admin’s providers', async () => {
    mockListSavedByUser.mockResolvedValue({ ok: true, items: [{ id: 3, contentType: 'IMAGE' }] });
    mockListFollowsByUser.mockResolvedValue({ ok: true, items: [7, 9] });

    const data = await loadAdmin();

    expect(data?.savedImageIds).toEqual([]);
    expect(data?.followedCollectionIds).toEqual([]);
  });

  /**
   * `grantedCollectionIds` describes the page, not the viewer, so unlike the toggle seeds it is
   * populated in every mode. The client needs it to tell an admin-granted association apart from a
   * followed one when reconciling an unfollow.
   */
  it('reports the granted collection ids in both modes, unlike the toggle seeds', async () => {
    const withGrant = {
      ...userPage,
      content: [{ id: 100, contentType: 'COLLECTION', referencedCollectionId: 1, slug: 'one' }],
    };
    mockGetUserPage.mockResolvedValue(withGrant);
    mockGetUserPageById.mockResolvedValue(withGrant);

    expect((await loadUserSpace('self'))?.grantedCollectionIds).toEqual([1]);
    expect((await loadAdmin())?.grantedCollectionIds).toEqual([1]);
  });
});
