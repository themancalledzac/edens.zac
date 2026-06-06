import { CollectionType, COLLECTION_TYPE_LABELS } from '@/app/types/Collection';

describe('COLLECTION_TYPE_LABELS', () => {
  it('has a non-empty label for every CollectionType', () => {
    for (const t of Object.values(CollectionType)) {
      expect(COLLECTION_TYPE_LABELS[t]).toBeTruthy();
    }
  });
});
