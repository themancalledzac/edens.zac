import {useState, useCallback} from 'react';
import {ChevronDown, X} from "lucide-react";
import styles from "../../styles/Upload.module.scss"
import {MetadataEditCard} from "@/Components/MetadataEditCard/MetadataEditCard";

const UploadQueue = ({uploading, setUploading, uploadQueue, dispatch, uploadProgress, setUploadProgress}) => {
    const [selectedItem, setSelectedItem] = useState(null);

    const removeFile = useCallback((fileId, e) => {
        e.stopPropagation(); // Prevent click from triggering item selection
        dispatch({
            type: 'REMOVE_FILE',
            id: fileId
        });
    }, [dispatch]);

    const uploadFiles = async () => {
        setUploading(true);
        const batchSize = 5;
        const files = [...uploadQueue];

        while (files.length > 0) {
            const batch = files.splice(0, batchSize);
            await Promise.all(batch.map(async (item) => {
                dispatch(prev =>
                    prev.map(f => f.id === item.id ? {...f, status: 'uploading'} : f)
                );

                for (let progress = 0; progress <= 100; progress += 10) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    setUploadProgress(prev => ({...prev, [item.id]: progress}));
                }

                dispatch(prev =>
                    prev.map(f => f.id === item.id ? {...f, status: 'completed'} : f)
                );
            }));
        }

        setUploading(false);
    };

    const renderMetadataGrid = (metadata) => {
        if (!metadata) return null;

        const pairs = Object.entries(metadata)
            .filter(([_, value]) => value !== null && value !== undefined)
            .map(([key, value]) => ({
                key: key.replace(/([A-Z])/g, ' $1').toLowerCase(),
                value: Array.isArray(value) ? value.join(', ') : String(value)
            }));

        return (
            <div className={styles.metadataGrid}>
                {pairs.map(({key, value}) => (
                    <div key={key} className={styles.metadataItem}>
                        <span className={styles.label}>{key}:</span>
                        <span className={styles.value}>{value}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.queue}>
            <div className={styles.header}>
                <div className={styles.info}>
                    <h2 className={styles.title}>Upload Queue</h2>
                    <p className={styles.count}>{uploadQueue.length} files selected</p>
                </div>
                {!uploading && !selectedItem && (
                    <button
                        onClick={uploadFiles}
                        className={styles.uploadButton}
                    >
                        Start Upload
                    </button>
                )}
            </div>

            <div className={styles.items}>
                {uploadQueue.map((item) => (
                    selectedItem === item.id ? (
                        <MetadataEditCard key={item.id} item={item} renderMetadataGrid={renderMetadataGrid}
                                          setSelectedItem={setSelectedItem} uploading={uploading}
                                          uploadFiles={uploadFiles}/>
                    ) : (
                        <div
                            key={item.id}
                            className={styles.queueItem}
                            onClick={() => setSelectedItem(item.id)}
                        >
                            <div className={styles.content}>
                                <div className={styles.preview}>
                                    <img
                                        src={URL.createObjectURL(item.file)}
                                        alt=""
                                        className={styles.image}
                                    />
                                </div>
                                <div className={styles.info}>
                                    <p className={styles.filename}>{item.file.name}</p>
                                    <p className={styles.size}>
                                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <p className={styles.size}>
                                        {item.metadata?.camera}
                                    </p>
                                </div>
                                <ChevronDown className={styles.chevronIcon}/>
                            </div>

                            <div className={styles.status}>
                                {item.status === 'uploading' && (
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.fill}
                                            style={{width: `${uploadProgress[item.id] || 0}%`}}
                                        />
                                    </div>
                                )}
                                {item.status === 'completed' && (
                                    <span className={styles.statusCompleted}>Completed</span>
                                )}
                                {item.status === 'queued' && (
                                    <span className={styles.queued}>Queued</span>
                                )}
                            </div>

                            {!uploading && item.status !== 'completed' && (
                                <button
                                    onClick={(e) => removeFile(item.id, e)}
                                    className={styles.remove}
                                >
                                    <X className={styles.icon}/>
                                </button>
                            )}
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

export default UploadQueue;