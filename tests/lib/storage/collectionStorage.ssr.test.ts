/**
 * @jest-environment node
 *
 * SSR guards for `app/lib/storage/collectionStorage.ts` (B8 characterization).
 *
 * Every method opens with `if (typeof window === 'undefined') return`. That guard
 * is what keeps the module importable from a Server Component — `collectionStorage`
 * is reached from `useCollectionEdit` and friends, which render on the server before
 * hydration. E3 collapses the trios into a generic pair, and the guard is the easiest
 * thing to drop in that rewrite, so it gets its own file.
 *
 * Node 22 defines a global `sessionStorage`, so simply running under the node
 * environment would not prove anything: the code would happily read and write it.
 * These tests swap in a recording double and assert it is never touched at all.
 */

import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { createCollectionModel, createImageContent } from '@/tests/fixtures/contentFixtures';

const storageSpy = {
  getItem: jest.fn<string | null, [string]>(),
  setItem: jest.fn<void, [string, string]>(),
  removeItem: jest.fn<void, [string]>(),
  clear: jest.fn<void, []>(),
  key: jest.fn<string | null, [number]>(),
  length: 0,
};

const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: storageSpy,
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  if (originalSessionStorage) {
    Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorage);
  }
});

function fullResponse(): CollectionUpdateResponseDTO {
  return { collection: createCollectionModel(7, { slug: 'wedding' }) };
}

function expectStorageUntouched(): void {
  expect(storageSpy.getItem).not.toHaveBeenCalled();
  expect(storageSpy.setItem).not.toHaveBeenCalled();
  expect(storageSpy.removeItem).not.toHaveBeenCalled();
}

describe('server-side rendering', () => {
  it('has no window global, which is what the guards key on', () => {
    expect(typeof window).toBe('undefined');
  });

  it('set touches no storage', () => {
    collectionStorage.set('wedding', createCollectionModel(7));

    expectStorageUntouched();
  });

  it('setFull touches no storage', () => {
    collectionStorage.setFull('wedding', fullResponse());

    expectStorageUntouched();
  });

  it('update touches no storage', () => {
    collectionStorage.update('wedding', createCollectionModel(7));

    expectStorageUntouched();
  });

  it('updateFull touches no storage', () => {
    collectionStorage.updateFull('wedding', fullResponse());

    expectStorageUntouched();
  });

  it('get returns null and touches no storage', () => {
    expect(collectionStorage.get('wedding')).toBeNull();

    expectStorageUntouched();
  });

  it('getFull returns null and touches no storage', () => {
    expect(collectionStorage.getFull('wedding')).toBeNull();

    expectStorageUntouched();
  });

  it('clear touches no storage', () => {
    collectionStorage.clear('wedding');

    expectStorageUntouched();
  });

  it('clearFull touches no storage', () => {
    collectionStorage.clearFull('wedding');

    expectStorageUntouched();
  });

  it('clearAll touches no storage', () => {
    collectionStorage.clearAll();

    expectStorageUntouched();
  });

  it('updateImagesInCache touches no storage', () => {
    collectionStorage.updateImagesInCache('wedding', [createImageContent(1)]);

    expectStorageUntouched();
  });
});
