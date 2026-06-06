'use client';

import Image from 'next/image';

import { IMAGE } from '@/app/constants';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';
import { isGifContent } from '@/app/utils/contentTypeGuards';

import styles from '../MetadataModal.module.scss';
import type { EditableContent } from '../types';

/**
 * Render the single-item preview: looping `<video>` for GIF/MP4, `<Image>` for stills.
 * Extracted as a local helper so the JSX stays readable and avoids nested ternaries.
 */
function renderSinglePreview({
  isGif,
  previewImageAsGif,
  previewImageAsImage,
}: {
  isGif: boolean;
  previewImageAsGif: ContentGifModel | null;
  previewImageAsImage: ContentImageModel | null;
}) {
  if (isGif && previewImageAsGif) {
    return (
      <video
        key={previewImageAsGif.gifUrl}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        preload="auto"
        poster={previewImageAsGif.thumbnailUrl ?? undefined}
        width={previewImageAsGif.width || IMAGE.defaultWidth}
        height={previewImageAsGif.height || IMAGE.defaultHeight}
        className={styles.previewMedia}
      >
        <source src={previewImageAsGif.gifUrl} type="video/mp4" />
      </video>
    );
  }
  if (previewImageAsImage) {
    return (
      <Image
        src={previewImageAsImage.imageUrl}
        alt={previewImageAsImage.alt || previewImageAsImage.title || 'Image preview'}
        width={previewImageAsImage.imageWidth || IMAGE.defaultWidth}
        height={previewImageAsImage.imageHeight || IMAGE.defaultHeight}
        className={styles.previewMedia}
        priority
        unoptimized
      />
    );
  }
  return null;
}

interface MediaPreviewProps {
  isBulkEdit: boolean;
  selectedImages: EditableContent[];
  selectedIds: number[];
  /** The first selected item used for the single-item preview. `undefined` causes a `null` render. */
  previewImage: EditableContent | undefined;
}

/**
 * Renders the left-side media preview panel of the MetadataModal.
 *
 * Three render paths:
 * - Bulk edit: a grid of thumbnails, one per selected item.
 * - Single GIF/MP4: a looping `<video>` element.
 * - Single image: a `<next/image>` element.
 */
export default function MediaPreview({
  isBulkEdit,
  selectedImages,
  selectedIds,
  previewImage,
}: MediaPreviewProps) {
  if (!previewImage) {
    return null;
  }

  if (isBulkEdit) {
    return (
      <div className={styles.imageSection}>
        <div className={styles.bulkEditGrid} data-testid="media-preview-bulk-grid">
          {selectedIds.map(imageId => {
            const item = selectedImages.find(i => i.id === imageId);
            if (!item) return null;
            // Bulk-edit thumbnail src: image uses imageUrl, GIF uses thumbnailUrl (still WebP).
            const thumbSrc =
              item.contentType === 'GIF'
                ? (item.thumbnailUrl ?? '')
                : ((item as ContentImageModel).imageUrl ?? '');
            if (!thumbSrc) return null;
            return (
              <div key={imageId} className={styles.bulkEditThumb}>
                <Image
                  src={thumbSrc}
                  alt={item.alt || item.title || 'Selected media'}
                  fill
                  className={styles.bulkEditThumbImg}
                  sizes="150px"
                  unoptimized
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const isGif = isGifContent(previewImage);
  const previewImageAsImage = !isGif ? (previewImage as ContentImageModel) : null;
  const previewImageAsGif = isGif ? (previewImage as ContentGifModel) : null;

  return (
    <div className={styles.imageSection}>
      {renderSinglePreview({ isGif, previewImageAsGif, previewImageAsImage })}
    </div>
  );
}
