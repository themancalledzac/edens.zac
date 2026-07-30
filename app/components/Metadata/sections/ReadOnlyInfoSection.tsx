'use client';

import { isGifContent } from '@/app/utils/contentTypeGuards';
import { formatLongDate } from '@/app/utils/formatDateRange';

import modalStyles from '../MetadataModal.module.scss';
import type { EditableContent } from '../types';

/**
 * Build the label/value rows for the read-only panel, skipping anything the content block
 * doesn't carry so the list never renders an "—" placeholder row.
 *
 * Capture date is omitted for GIF/MP4 blocks: they have no EXIF, and their date is surfaced (and
 * changed) by the pick-a-reference-image row in {@link EssentialInfoSection} instead.
 */
function buildRows(content: EditableContent): Array<{ label: string; value: string }> {
  const isGif = isGifContent(content);
  const width = isGif ? content.width : content.imageWidth;
  const height = isGif ? content.height : content.imageHeight;

  const rows: Array<{ label: string; value: string }> = [];

  if (!isGif && content.captureDate) {
    rows.push({ label: 'Captured', value: formatLongDate(content.captureDate) });
  }
  if (!isGif && content.rawFileName) {
    rows.push({ label: 'File', value: content.rawFileName });
  }
  if (width && height) {
    rows.push({ label: 'Dimensions', value: `${width} × ${height}` });
  }
  if (content.createdAt) {
    rows.push({ label: 'Uploaded', value: formatLongDate(content.createdAt) });
  }
  rows.push({ label: 'Content ID', value: String(content.id) });

  return rows;
}

export interface ReadOnlyInfoSectionProps {
  /** The single content block being edited. Bulk edit does not render this section. */
  content: EditableContent;
}

/**
 * Read-only companion to the editable form sections: the facts about a content block that the
 * admin cannot change but still needs to see while editing — capture date, source filename,
 * pixel dimensions, upload time, and the content ID used when cross-referencing the backend.
 */
export default function ReadOnlyInfoSection({
  content,
}: ReadOnlyInfoSectionProps): React.JSX.Element {
  const rows = buildRows(content);

  return (
    <div className={modalStyles.formSection}>
      <h3 className={modalStyles.sectionHeading}>File Information</h3>

      <dl className={modalStyles.readOnlyList}>
        {rows.map(row => (
          <div key={row.label} className={modalStyles.readOnlyRow}>
            <dt className={modalStyles.readOnlyLabel}>{row.label}</dt>
            <dd className={modalStyles.readOnlyValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
