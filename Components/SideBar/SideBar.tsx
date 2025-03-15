import styles from "./SideBar.module.scss";

export default function SideBar({image, width}) {
    if (!image) return null;

    // format metadata for display
    const formatMetadata = (key, value) => {
        if (Array.isArray(value)) {
            return value.join(", ");
        }
        return value;
    }

    const displayKeys = [
        "title",
        "camera",
        "lens",
        "focalLength",
        "fstop",
        "shutterSpeed",
        "iso",
        "author",
        "location",
        "createDate"
    ];

    console.log(JSON.stringify(image));

    return (
        <div className={styles.sidebarWrapper} style={{width}}>
            <h2 className={styles.sidebarTitle}>Image Details</h2>
            <div className={styles.metadataGrid}>
                {displayKeys.map(key => {
                    if (image[key] === null || image[key] === undefined) return null;

                    return (
                        <div key={key} className={styles.metadataRow}>
                            <div className={styles.metadataLabel}>
                                {/*// TODO WHY WOULD WE DO THIS HERE?! Obviously a bad idea let's move this asap*/}
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </div>
                            <div className={styles.metadataValue}>
                                <h3>{formatMetadata(key, image[key])}</h3>
                            </div>
                        </div>
                    )
                })}
            </div>

            {image.catalog && image.catalog.length > 0 && (
                <div className={styles.catalogSection}>
                    <h3 className={styles.sectionTitle}>Catalogs</h3>
                    <div className={styles.catalogList}>
                        {image.catalog.map(cat => (
                                <div key={cat.id} className={styles.catalogItem}>
                                    {cat.title}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    )
};
