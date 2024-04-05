import styles from '../styles/Home.module.scss'
import ParallaxSection from "../Components/ParallaxSection/ParallaxSection";
import imageDirectory from "../Images/imageDirectory.json";
import projectStructure from "../Images/projectStructure.json";
import { useEffect, useState } from "react";
import PhotographyPage from "../Components/PhotographyPage/PhotographyPage";

export default function Home() {
    const [isPhotographyPage, setIsPhotographyPage] = useState( true );
    const [photoPageList, setPhotoPageList] = useState( ["Amsterdam", "Paris", "Florence", "Rome", "Vienna"]
    );
    const [photoDataList, setPhotoDataList] = useState( [] );
    const [currentAdventure, setCurrentAdventure] = useState( '' );

    const queryString = photoPageList.join( ',' );
    // http://localhost:8080/api/v1/image/getImagesByAdventures?adventures=Amsterdam,Paris,Rome

    const oldUrl = `http://localhost:8080/api/v1/image/getImagesByAdventures?adventures=${queryString}`;
    const url = 'http://localhost:8080/api/v1/adventure/mainPageAdventureList';

    // on initial page load

    // useEffect( () => {
    //     let data;
    //     const fetchData = async () => {
    //         try {
    //
    //             data = await fetch( url, { cache: 'force-cache' } );
    //         } finally {
    //             console.log( data.body );
    //
    //         }
    //     }
    //     fetchData();
    // }, [] );

    useEffect( () => {
        const fetchData = async () => {
            try {
                const response = await fetch( url, { cache: 'force-cache' } );
                if ( !response.ok ) {
                    throw new Error( 'Network response was not ok' );
                }
                const data = await response.json(); // This line reads and parses the JSON body
                console.log( data ); // Now `data` contains the parsed JSON object
                setPhotoDataList( data );
            } catch (error) {
                console.error( "Fetch error: ", error );
            }
        };
        fetchData();
    }, [] );

    return (
        <div className={styles.container}>
            <div className={styles.navBarWrapper}>
                <div className={styles.navBarLeft}>
                    <h2>Zechariah Edens Portfolio</h2>
                    <h2>coding</h2>
                </div>
                <div className={styles.navBarRight}>
                    <h2>photography</h2>
                    <h2>About</h2>
                </div>
            </div>
            {isPhotographyPage && ( photoDataList.length > 0 ) ?
                <PhotographyPage photoDataList={photoDataList}
                                 setCurrentAdventure={setCurrentAdventure}/>
                : <></>}
            {/* todo: Add <CodingPage /> Here */}
        </div>
    )
}
