import {isLocalEnvironment} from "@/utils/environment";
import {useRouter} from "next/router";
import React, {ChangeEvent, Reducer, ReducerState, useEffect, useReducer, useState} from "react";
import styles from "../../styles/Upload.module.scss";
import {QueueAction, QueueItem} from "@/interfaceLibrary/QueueTypes";
import {queueReducer} from "@/state/reducers/queueReducer";
import UploadQueue from "@/Components/UploadQueue/UploadQueue";
import Header from "@/Components/Header/Header";

export async function getServerSideProps() {
    if (!isLocalEnvironment()) {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            },
        };
    }

    return {
        props: {}
    }
}

export default function UploadPage() {
    const [uploadQueue, dispatch] = useReducer<
        Reducer<QueueItem[], QueueAction>,
        ReducerState<Reducer<QueueItem[], QueueAction>>,
        (arg: ReducerState<Reducer<QueueItem[], QueueAction>>) =>
            ReducerState<Reducer<QueueItem[], QueueAction>>
    >(
        queueReducer,
        [] as ReducerState<Reducer<QueueItem[], QueueAction>>,
        (initial) => initial
    );
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        console.log('Files selected:', files);

        // Add files to queue immediately with 'processing' status
        dispatch({
            type: 'ADD_FILES',
            files: files
        });

        const formData = new FormData();

        files.forEach(file => {
            console.log('Adding file:', file.name, file.type);
            formData.append('images', file);
        });

        try {
            const response = await fetch('/api/proxy/v1/image/getBatchImageMetadata', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const metadataList = await response.json();
            console.log(metadataList);
            // Update metadata for each file
            files.forEach((file, index) => {
                const fileId = `${file.name}`;
                dispatch({
                    type: 'UPDATE_METADATA',
                    id: fileId,
                    metadata: metadataList[index]
                });
            });
        } catch (error) {
            // Handle error for all files
            files.forEach(file => {
                const fileId = `${file.name}-${Date.now()}`;
                dispatch({
                    type: 'SET_ERROR',
                    id: fileId
                });
            });
            console.error('Error fetching metadata:', error);
        }
    };

    useEffect(() => {

        console.log(uploadQueue);

    }, [uploadQueue]);

    return (
        <div>
            <Header/>
            <div className={styles.batchUploader}>
                <div className={styles.uploadZone}>
                    <div className={styles.container}>
                        <h1 className={styles.icon}>UPLOAD</h1>
                        <p className={styles.title}>Select images for upload</p>
                        <p className={styles.subtitle}>Support for batch uploads (up to 200 images)</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className={styles.input}
                            id="file-upload"
                        />
                        <button
                            onClick={() => document.getElementById('file-upload').click()}
                            className={styles.button}
                        >
                            Select Files
                        </button>
                    </div>
                </div>

                {uploadQueue.length > 0 && (
                    <>
                        <UploadQueue uploading={uploading} setUploading={setUploading} uploadQueue={uploadQueue}
                                     dispatch={dispatch} uploadProgress={uploadProgress}
                                     setUploadProgress={setUploadProgress}></UploadQueue>
                    </>
                )
                }
            </div>
        </div>
    );
};