/**
 * Render harness for the six `useCollectionEdit.*` hook test files.
 *
 * Each of them hand-rolled the same `renderEdit` wrapper, and they had already drifted: some
 * accepted `enabled` and `onExitManage`, others hard-coded `enabled: true` and could not exercise
 * the disabled path at all.
 *
 * This lives apart from `tests/fixtures/collectionEditFixtures.ts` because it is the only piece
 * that needs a VALUE import of `useCollectionEdit`. Putting it there would make every consumer of
 * a plain data builder — `tests/explore/page.test.tsx` wants only `makeMetadata()` — load the hook
 * and its whole API surface into their module registry.
 *
 * `jest.mock` calls are per-test-file, so the hook imported here resolves against the calling
 * file's mocks exactly as an inline `renderHook` did.
 */

import { act, renderHook } from '@testing-library/react';

import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import { type CollectionModel } from '@/app/types/Collection';

import { makeCollection } from './collectionEditFixtures';

export function renderEdit(
  options: { enabled?: boolean; collection?: CollectionModel; onExitManage?: () => void } = {}
) {
  const collection = options.collection ?? makeCollection();
  return renderHook(() =>
    useCollectionEdit({
      collection,
      slug: collection.slug,
      enabled: options.enabled ?? true,
      onExitManage: options.onExitManage,
    })
  );
}

/** Drain the data-load and getMetadata promise chains inside `act`. */
export async function flushEffects() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}
