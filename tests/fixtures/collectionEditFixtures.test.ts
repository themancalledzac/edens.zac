/**
 * Guards the freshness contract of `tests/fixtures/collectionEditFixtures.ts`.
 *
 * Every builder must construct a new object graph per call, nested arrays and Sets included.
 * This is not tidiness. The C1 regression tests in `useCollectionEdit.buffer.test.tsx` reproduce
 * a bug whose only trigger is an array IDENTITY change between two successive DTOs: the old
 * effect's deps were `[enabled, collection.id, collection.galleryPassword,
 * collection.recipientEmails]`, so it re-fired — and wiped staged People and gallery edits — only
 * when a refresh handed it a different array instance.
 *
 * Hoist any of these literals to a module constant and two DTOs share one array. The deps then
 * compare equal, the effect never re-fires, and the C1 tests go green against the buggy source
 * they exist to catch. That is exactly how C1's own first-draft test was worthless until rewritten.
 *
 * These assertions are deliberately reference-identity (`not.toBe`), never value equality — the
 * values are supposed to be equal, and only the identities carry the signal.
 */

import { type GeneralMetadataDTO } from '@/app/types/Collection';
import {
  makeCollection,
  makeEdit,
  makeListModel,
  makeMetadata,
  makeMetadataRich,
  makeResponse,
  makeUpdateData,
} from '@/tests/fixtures/collectionEditFixtures';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

const METADATA_LIST_KEYS: (keyof GeneralMetadataDTO)[] = [
  'tags',
  'people',
  'locations',
  'cameras',
  'lenses',
  'filmTypes',
  'filmFormats',
  'collections',
];

describe('collectionEditFixtures — builders return fresh object graphs', () => {
  it('makeCollection returns a new collection with its own content and locations arrays', () => {
    const first = makeCollection();
    const second = makeCollection();

    expect(first).not.toBe(second);
    expect(first.content).not.toBe(second.content);
    expect(first.locations).not.toBe(second.locations);
    expect(first).toEqual(second);
  });

  it('makeCollection ignores mutations made to an earlier call', () => {
    const first = makeCollection();
    first.content?.push(createImageContent(101));
    first.locations?.push({ id: 3, name: 'Seattle', slug: 'seattle' });
    expect(first.content).toHaveLength(1);
    expect(first.locations).toHaveLength(1);

    const second = makeCollection();

    expect(second.content).toHaveLength(0);
    expect(second.locations).toHaveLength(0);
  });

  it.each(METADATA_LIST_KEYS)('makeMetadata gives %s a new array each call', key => {
    const first = makeMetadata();
    const second = makeMetadata();

    expect(first).not.toBe(second);
    expect(first[key]).not.toBe(second[key]);
  });

  it.each(METADATA_LIST_KEYS)('makeResponse gives %s a new array each call', key => {
    const first = makeResponse();
    const second = makeResponse();

    expect(first).not.toBe(second);
    expect(first.collection).not.toBe(second.collection);
    expect(first[key]).not.toBe(second[key]);
  });

  it('makeResponse keeps the DTO list and its collection list distinct within one call', () => {
    const response = makeResponse();

    expect(response.locations).not.toBe(response.collection.locations);
  });

  it('makeResponse gives the C1-shaped DTO a fully distinct graph each call', () => {
    const first = makeResponse({ people: [], recipientEmails: [] });
    const second = makeResponse({ people: [], recipientEmails: [] });

    expect(first).not.toBe(second);
    expect(first.collection).not.toBe(second.collection);
    expect(first.people).not.toBe(second.people);
    expect(first.people).not.toBe(first.collection.people);
  });

  it('makeEdit gives each call its own nested arrays and reorder object', () => {
    const first = makeEdit();
    const second = makeEdit();

    expect(first.reorder).not.toBe(second.reorder);
    expect(first.reorder.displayOrder).not.toBe(second.reorder.displayOrder);
    expect(first.reorder.moves).not.toBe(second.reorder.moves);
    expect(first.displayContent).not.toBe(second.displayContent);
    expect(first.contentToEdit).not.toBe(second.contentToEdit);
    expect(first.selectedIds).not.toBe(second.selectedIds);
    expect(first.collectionPeople).not.toBe(second.collectionPeople);
    expect(first.currentLocations).not.toBe(second.currentLocations);
    expect(first.currentTags).not.toBe(second.currentTags);
    expect(first.allCollections).not.toBe(second.allCollections);
    expect(first.bottomBarCells).not.toBe(second.bottomBarCells);
    expect(first.currentState).not.toBe(second.currentState);
  });

  it('makeMetadataRich returns new arrays and new member objects each call', () => {
    const first = makeMetadataRich();
    const second = makeMetadataRich();

    expect(first).not.toBe(second);
    expect(first.tags).not.toBe(second.tags);
    expect(first.people).not.toBe(second.people);
    expect(first.tags?.[0]).not.toBe(second.tags?.[0]);
    expect(first).toEqual(second);
  });

  it('makeListModel and makeUpdateData return new objects each call', () => {
    expect(makeListModel()).not.toBe(makeListModel());
    expect(makeUpdateData()).not.toBe(makeUpdateData());
  });

  it('makeEdit gives each relation triple its own Sets, across calls and within one call', () => {
    const first = makeEdit();
    const second = makeEdit();

    expect(first.childIds).not.toBe(second.childIds);
    expect(first.childIds.saved).not.toBe(second.childIds.saved);
    expect(first.childIds.pendingAdd).not.toBe(second.childIds.pendingAdd);
    expect(first.childIds.pendingRemove).not.toBe(second.childIds.pendingRemove);

    expect(first.childIds.saved).not.toBe(first.siblingIds.saved);
    expect(first.childIds.saved).not.toBe(first.parentIds.saved);
    expect(first.childIds.saved).not.toBe(first.childIds.pendingAdd);
  });

  it('makeEdit relation Sets are independently mutable', () => {
    const edit = makeEdit();
    edit.childIds.saved.add(1);

    expect(edit.siblingIds.saved.size).toBe(0);
    expect(edit.parentIds.saved.size).toBe(0);
    expect(makeEdit().childIds.saved.size).toBe(0);
  });
});
