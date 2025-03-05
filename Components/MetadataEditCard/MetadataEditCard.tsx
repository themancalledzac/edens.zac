import styles from "@/styles/Upload.module.scss";
import {X} from "lucide-react";

export const MetadataEditCard = ({item, uploading, uploadFiles, setSelectedItem, renderMetadataGrid}) => (
    <div className={styles.queueItemExpanded}>
        <div className={styles.header}>
            <div className={styles.leftSection}>
                <div className={styles.expandedPreview}>
                    <img
                        src={URL.createObjectURL(item.file)}
                        alt=""
                    />
                </div>
                <div className={styles.expandedInfo}>
                    <h2>{item.file.name}</h2>
                    <p>{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            </div>
            <div className={styles.actions}>
                <button
                    onClick={() => setSelectedItem(null)}
                    className={styles.closeButton}
                >
                    <X className={styles.icon}/>
                </button>
            </div>
        </div>
        {renderMetadataGrid(item.metadata)}
    </div>
);