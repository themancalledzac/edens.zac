/**
 * Tests for useToggleTriple — the single source for the
 * (savedIds, pendingAddIds, pendingRemoveIds) feeder pattern consumed by
 * CollectionListSelector across the image + collection editors.
 *
 * Covers the four state transitions:
 * - initial (only saved, no pending)
 * - add (a pending addition not already saved)
 * - remove (a saved id staged for removal)
 * - re-add-after-remove (the same id appears in both adds and removes)
 *
 * Plus the guard that already-saved ids passed in `pendingAdds` are ignored.
 */

import { renderHook } from '@testing-library/react';

import { useToggleTriple } from '@/app/hooks/useToggleTriple';

interface Row {
  collectionId: number;
  name: string;
}

const row = (id: number): Row => ({ collectionId: id, name: `C${id}` });
const getId = (r: Row) => r.collectionId;

describe('useToggleTriple', () => {
  it('initial: only saved ids, no pending', () => {
    const { result } = renderHook(() => useToggleTriple([1, 2], undefined, undefined, getId));
    expect([...result.current.savedIds]).toEqual([1, 2]);
    expect([...result.current.pendingAddIds]).toEqual([]);
    expect([...result.current.pendingRemoveIds]).toEqual([]);
  });

  it('add: a not-yet-saved pending addition surfaces in pendingAddIds', () => {
    const { result } = renderHook(() => useToggleTriple([1], [row(5)], undefined, getId));
    expect([...result.current.savedIds]).toEqual([1]);
    expect([...result.current.pendingAddIds]).toEqual([5]);
    expect([...result.current.pendingRemoveIds]).toEqual([]);
  });

  it('remove: a saved id staged for removal surfaces in pendingRemoveIds', () => {
    const { result } = renderHook(() => useToggleTriple([1, 2], undefined, [2], getId));
    expect([...result.current.savedIds]).toEqual([1, 2]);
    expect([...result.current.pendingAddIds]).toEqual([]);
    expect([...result.current.pendingRemoveIds]).toEqual([2]);
  });

  it('re-add after remove: an id can appear in both pendingAdd and pendingRemove independently', () => {
    // id 2 is saved+removed; id 5 is a fresh add. The triple keeps the two channels separate.
    const { result } = renderHook(() => useToggleTriple([2], [row(5)], [2], getId));
    expect([...result.current.savedIds]).toEqual([2]);
    expect([...result.current.pendingAddIds]).toEqual([5]);
    expect([...result.current.pendingRemoveIds]).toEqual([2]);
  });

  it('ignores already-saved ids passed in pendingAdds (callers may pass raw membership)', () => {
    // 1 is already saved, 9 is genuinely new — only 9 counts as a pending add.
    const { result } = renderHook(() => useToggleTriple([1], [row(1), row(9)], undefined, getId));
    expect([...result.current.pendingAddIds]).toEqual([9]);
  });

  it('memoizes each set across re-renders with stable inputs', () => {
    const originalIds = [1, 2];
    const adds = [row(5)];
    const removes = [2];
    const { result, rerender } = renderHook(() =>
      useToggleTriple(originalIds, adds, removes, getId)
    );
    const first = result.current;
    rerender();
    expect(result.current.savedIds).toBe(first.savedIds);
    expect(result.current.pendingAddIds).toBe(first.pendingAddIds);
    expect(result.current.pendingRemoveIds).toBe(first.pendingRemoveIds);
  });
});
