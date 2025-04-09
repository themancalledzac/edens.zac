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

  return (
    <div
      style={isMobile ? { width: '100%' } : { width: `${contentWidth / 2}px padding: '2px'` }}
      className={styles.updateToolbar}>
      <button className={styles.updateButton} onClick={() => handleSaveChanges()}>Save</button>
      <button className={styles.updateButton} onClick={() => handleCancelChanges()}>Cancel</button>
    </div>
  );
};