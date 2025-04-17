import styles from './ImageInfo.module.scss';

export default function ImageInfo({ image, width }) {
  if (!image) return null;

  // format metadata for display
  const formatMetadata = (key: string, value: any[]) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value;
  };

  const displayKeys = [
    'title',
    'camera',
    'lens',
    'focalLength',
    'fstop',
    'shutterSpeed',
    'iso',
    'author',
    'location',
    'createDate',
  ];

  return (
    <div className={styles.sidebarWrapper} style={{ width }}>
      <h2 className={styles.sidebarTitle}>Image Details</h2>

      <div className={styles.metadataContainer}>
        <div className={styles.metadataGrid}>
          {displayKeys.map(key => {
            if (image[key] === null || image[key] === undefined) return null;

            return (
              <div key={key} className={styles.metadataRow}>
                <div className={styles.metadataLabel}>
                  {key}
                </div>
                <div className={styles.metadataValue}>
                  <h3>{formatMetadata(key, image[key])}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.categoriesContainer}>
        {image.catalog && image.catalog.length > 0 && (
          <div className={styles.catalogSection}>
            <h3 className={styles.sectionTitle}>Catalogs</h3>
            <div className={styles.catalogList}>
              {image.catalog.map(cat => (
                  <div className={styles.catalogItem}>
                    {cat}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {image.tags && image.tags.length > 0 && (
          <div className={styles.tagSection}>
            <h3 className={styles.sectionTitle}>Tags</h3>
            <div className={styles.tagList}>
              {image.tags.map(tag => (
                <div key={tag} className={styles.tagItem}>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
