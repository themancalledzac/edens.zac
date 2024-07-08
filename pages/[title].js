import { useRouter } from 'next/router';
import PhotoBlockComponent from "../Components/PhotoBlockComponent/PhotoBlockComponent";
import React, { useEffect, useState } from "react";
import styles from '../styles/Catalog.module.scss';
import ImageFullScreen from "../Components/ImageFullScreen/ImageFullScreen";
import Header from "../Components/Header/Header";
import { useAppContext } from "../context/AppContext";
import amsterdamPage from "../Images/amsterdamPage.json";
import parisPage from "../Images/parisPage.json";
import florencePage from "../Images/florencePage.json";
import romePage from "../Images/romePage.json";
import viennaPage from "../Images/viennaPage.json";
import corporatePage from "../Images/corporatePage.json";

/**
 * Photography Gallery Page.
 * Currently, has a switch case with local json files when backend not available.
 * @param params
 * @returns {Promise<{props: {data: {}}}|{props: {data: {}}}|{props: {data: {}}}|{props: {data: {}}}|{props: {data: *[]}}|{props: {data: {}}}>}
 */
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

        switch (params.title) {
            case "amsterdam":
                return { props: { data: amsterdamPage } };
            case "paris":
                return { props: { data: parisPage } };
            case "florence":
                return { props: { data: florencePage } };
            case "rome":
                return { props: { data: romePage } };
            case "vienna":
                return { props: { data: viennaPage } };
            case "corporate":
                return { props: { data: corporatePage } };
        }
        // return { props: { data: staticData } }; // commented out until our 'local' solution is no longer needed
    }
}

async function chunkArray( photoArray, chunkSize ) {
    let result = [];
    let todo = [];

    for (const photo of photoArray) {
        if ( photo?.rating === 5 && !( photo?.imageHeight > photo?.imageWidth ) ) { // TODO: Add an, `&& if vertical`
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
        setCurrentCatalog,
        isMobile
    } = useAppContext();
    const [photoList, setPhotoList] = useState( [] );
    const [imageSelected, setImageSelected] = useState( null );
    const router = useRouter();

    useEffect( () => {
        const handleKeyDown = ( event ) => {
            if ( imageSelected === null ) return;

            const flattenedData = data.flat();
            const currentIndex = flattenedData.findIndex( img => img.id === imageSelected.id );

            if ( event.key === "ArrowRight" ) {
                const nextIndex = ( currentIndex + 1 ) % flattenedData.length;
                setImageSelected( flattenedData[ nextIndex ] );
            } else if ( event.key === "ArrowLeft" ) {
                const prevIndex = ( currentIndex - 1 + flattenedData.length ) % flattenedData.length;
                setImageSelected( flattenedData[ prevIndex ] );
            }
        };

        window.addEventListener( 'keydown', handleKeyDown );

        return () => {
            window.removeEventListener( 'keydown', handleKeyDown );
        }

    }, [data, imageSelected] );

    if ( !data ) {
        return <div>Loading...</div>;
    }

    console.log( imageSelected ); // current full image object, such as:

    return (
        <div className={styles.catalogPageMain}>
            <Header isPhotographyPage={isPhotographyPage}/>
            <div className={styles.photoBlockWrapper}>
                {data.map( ( photoPair, index ) => (
                    <PhotoBlockComponent
                        key={index}
                        photos={photoPair}
                        imageSelected={imageSelected}
                        setImageSelected={setImageSelected}
                    />
                ) )}
            </div>
        </div>
    );
};

export default TitlePage;