import { useRouter } from 'next/router';
import PhotoBlockComponent from "../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, { useEffect, useState } from "react";
import styles from '../styles/Catalog.module.scss';
import ImageFullScreen from "../Components/ImageFullScreen/ImageFullScreen";
import Header from "../Components/Header/Header";
import { useAppContext } from "../context/AppContext";

export async function getServerSideProps( { params } ) {
    const url = `http://localhost:8080/api/v1/image/getImagesByCatalogs/${params.title}`;

    try {
        const response = await fetch( url, { cache: 'force-cache' } );
        if ( !response.ok ) {
            throw new Error( 'Network response not ok.' );
        }
        const photoDataList = await response.json();
        const chunkedList = await chunkArray( photoDataList, 2 );

        return {
            props: { data: chunkedList },
        };
    } catch (error) {
        console.error( "Fetch error: ", error );
        return { props: { data: [] } }; // return empty data in case of error
    }
}

// old
// async function chunkArray( photoArray, chunkSize ) {
//     let result = [];
//     for (let i = 0; i < photoArray.length; i += chunkSize) {
//         result.push( photoArray.slice( i, i + chunkSize ) );
//     }
//     return result;
// }

async function chunkArray( photoArray, chunkSize ) {
    let result = [];
    let todo = [];

    for (const photo of photoArray) {
        if ( photo.rating === 5 && !( photo.imageHeight > photo.imageWidth ) ) { // TODO: Add an, `&& if vertical`
            // If it's a 5-star image, add it immediately as a single-image pair.
            result.push( [photo] );
        } else {
            // Add current image to the waiting list.
            todo.push( photo );
            // If we have enough images for a pair, add them to the result.
            if ( todo.length === chunkSize ) {
                result.push( [...todo] ); // Use spread operator to clone the array
                todo = []; // Clear the todo list
            }
        }
    }

    // If there's an image left over that didn't form a pair, add it to the result.
    if ( todo.length > 0 ) {
        result.push( todo );
    }

    return result;
}


// The page component that renders the content for each title
const TitlePage = ( { data } ) => {
    const {
        isPhotographyPage,
        photoDataList,
        setCurrentCatalog
    } = useAppContext();
    const [photoList, setPhotoList] = useState( [] );
    const [selectedPhoto, setSelectedPhoto] = useState( null );
    const router = useRouter();
    if ( !data ) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.catalogPageMain}>
            <Header isPhotographyPage={isPhotographyPage}/>
            <div className={styles.photoBlockWrapper}>
                {data.map( ( photoPair, index ) => (
                    <PhotoBlockComponent key={index} photos={photoPair}/>
                ) )}
            </div>
        </div>
    );
};

export default TitlePage;