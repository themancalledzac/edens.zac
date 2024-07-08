import styles from '../styles/Home.module.scss'
import ParallaxSection from "../Components/ParallaxSection/ParallaxSection";
import imageDirectory from "../Images/imageDirectory.json";
import projectStructure from "../Images/projectStructure.json";
import { useEffect, useState } from "react";
import PhotographyPage from "../Components/PhotographyPage/PhotographyPage";
import CodingPage from "../Components/CodingPage/CodingPage";
import Header from "../Components/Header/Header";
import { useAppContext } from "../context/AppContext";
import photoData from "../Images/homePagePhotoData.json";

export default function Home() {
    const {
        isPhotographyPage,
        photoDataList,
        setCurrentCatalog,
        setPhotoDataList
    } = useAppContext();
    // const [isPhotographyPage, setIsPhotographyPage] = useState( true );
    // const [photoDataList, setPhotoDataList] = useState( [] );
    // const [currentCatalog, setCurrentCatalog] = useState( '' );


    const url = 'http://localhost:8080/api/v1/catalog/mainPageCatalogList';

    useEffect( () => {
        const fetchData = async () => {
            try {
                let response = await fetch( url, { cache: 'no-store' } ); // or force-cache
                if ( !response.ok ) {
                    throw new Error( 'Network response was not ok' );
                }
                const data = await response.json(); // This line reads and parses the JSON body
                console.log( data ); // Now `data` contains the parsed JSON object
                setPhotoDataList( data );
            } catch (error) {
                console.error( "Fetch error: ", error );
                setPhotoDataList( photoData );
            }
        };
        fetchData();
    }, [setPhotoDataList] );

    return (
        <div className={styles.container}>
            <Header isPhotographyPage={isPhotographyPage}/>
            {isPhotographyPage && ( photoDataList.length > 0 ) ?
                <PhotographyPage photoDataList={photoDataList} setCurrentCatalog={setCurrentCatalog}/>
                : <CodingPage photoDataList={photoDataList} setCurrentCatalog={setCurrentCatalog}/>
            }
        </div>
    )
}
