/**
 * Builds the duplicated "Your Selects" content list prepended to a collection's blocks for the
 * owning viewer. Each entry is a SHALLOW CLONE of the in-place image, stamped with the local
 * `PINNED_SELECT` marker — the original still renders in its normal position ("exists in both
 * spots"). Cloning (vs mutating) keeps `id`-based de-dupe/layout working on the originals and
 * avoids leaking the marker onto the shared model. v1 pins IMAGE content only.
 */
import { type AnyContentModel, type ContentImageModel } from '@/app/types/Content';
import { type MaybePinned, PINNED_SELECT } from '@/app/types/Selects';

export function buildPinnedSelects(
  content: AnyContentModel[],
  selectedIds: ReadonlySet<number>
): MaybePinned<ContentImageModel>[] {
  if (selectedIds.size === 0) return [];

  const byId = new Map<number, ContentImageModel>();
  for (const block of content) {
    if (block.contentType === 'IMAGE') {
      byId.set(block.id, block as ContentImageModel);
    }
  }

  const pinned: MaybePinned<ContentImageModel>[] = [];
  for (const id of selectedIds) {
    const block = byId.get(id);
    if (block) {
      pinned.push({ ...block, [PINNED_SELECT]: true });
    }
  }
  return pinned;
}
