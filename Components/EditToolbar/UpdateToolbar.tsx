import {useEditContext} from "@/context/EditContext";
import styles from "../../styles/Edit.module.scss";

interface updateToolbarProps {
    handleCancelChanges: () => void;
    contentWidth: number;
    isMobile: boolean;
}


/**
 * Update Toolbar
 * Do we NEED these params or should these be coming from context? for now this is fine
 * @param handleCancelChanges
 * @param isMobile
 * @param contentWidth
 */
export const UpdateToolbar = ({handleCancelChanges, contentWidth, isMobile}: updateToolbarProps) => {
    const {isEditMode, setIsEditMode} = useEditContext();
    if (!isEditMode) return null;

    return (
        <div
            style={isMobile ? {width: '100%'} : {width: `${contentWidth}px`, margin: '0 auto'}}
            className={styles.updateToolbar}>
            <button className={styles.updateButton} onClick={() => handleCancelChanges()}>Update</button>
            <button className={styles.updateButton} onClick={() => setIsEditMode(!isEditMode)}>Save</button>
            <button className={styles.updateButton} onClick={() => setIsEditMode(!isEditMode)}>Cancel</button>
        </div>
    )
}