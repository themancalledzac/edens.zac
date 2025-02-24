import {isLocalEnvironment} from "@/utils/environment";
import {useRouter} from "next/router";
import React, {ChangeEvent, Reducer, ReducerState, useEffect, useReducer, useState} from "react";
import styles from "../../styles/Upload.module.scss";
import {QueueAction, QueueItem} from "@/interfaceLibrary/QueueTypes";
import {queueReducer} from "@/state/reducers/queueReducer";
import UploadQueue from "@/Components/UploadQueue/UploadQueue";
import Header from "@/Components/Header/Header";
import UploadModule from "@/Components/UploadModule/UploadModule";
import {MetadataEditCard} from "@/Components/MetadataEditCard/MetadataEditCard";

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
    const [isSelected, setIsSelected] = useState<Boolean>(false);

    useEffect(() => {

        if (uploadQueue.length === 0) {
            setIsSelected(false);
        }

    }, [uploadQueue]);

    return (
        <div>
            <Header/>
            <div className={styles.batchUploader}>
                <UploadModule uploadQueue={uploadQueue} dispatch={dispatch} isSelected={isSelected}
                              setIsSelected={setIsSelected}/>

                {uploadQueue.length > 0 && (
                    <UploadQueue uploading={uploading} setUploading={setUploading} uploadQueue={uploadQueue}
                                 dispatch={dispatch} uploadProgress={uploadProgress}
                                 setUploadProgress={setUploadProgress}></UploadQueue>
                )
                }
                {/*{0 === 1 && (*/}
                {/*    <MetadataEditCard / TOOD: need to add 'current image' to Global State, in order to move this here>*/}
                {/*)}*/}
            </div>
        </div>
    );
};