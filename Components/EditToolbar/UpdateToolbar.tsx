import { useEditContext } from '@/context/EditContext';

import styles from '../../styles/Edit.module.scss';

interface updateToolbarProps {
  handleCancelChanges: () => void;
  handleSaveChanges: () => void;
  contentWidth: number;
  isMobile: boolean;
}


/**
 * Update Toolbar
 * Do we NEED these params or should these be coming from context? for now this is fine
 * @param handleCancelChanges
 * @param handleSaveChanges
 * @param isMobile
 * @param contentWidth
 */
export const UpdateToolbar = ({
  handleCancelChanges,
  handleSaveChanges,
  contentWidth,
  isMobile,
}: updateToolbarProps) => {
  const { isEditMode, setIsEditMode } = useEditContext();
  if (!isEditMode) return null;

  return (
    <div
      style={isMobile ? { width: '100%' } : { width: `${contentWidth}px`, margin: '0 auto' }}
      className={styles.updateToolbar}>
      <button className={styles.updateButton} onClick={() => handleCancelChanges()}>Upload</button>
      <button className={styles.updateButton} onClick={() => handleSaveChanges()}>Save</button>
      {/* eslint-disable-next-line @stylistic/max-len */}
      <button className={styles.updateButton} onClick={() => setIsEditMode(!isEditMode)}>Cancel</button>
    </div>
  );
};