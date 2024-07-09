import styles from '../styles/Home.module.scss'
import PhotographyPage from "../Components/PhotographyPage/PhotographyPage";
import CodingPage from "../Components/CodingPage/CodingPage";
import Header from "../Components/Header/Header";
import { useAppContext } from "../context/AppContext";
import photoData from "../Images/homePagePhotoData.json";

export async function getServerSideProps() {
    const url = 'http://localhost:8080/api/v1/catalog/mainPageCatalogList';
    try {
        const response = await fetch( url );
        const data = await response.json();
        const sortedData = data.sort( ( a, b ) => a.priority - b.priority );
        return { props: { homePageCatalogList: sortedData } };
    } catch (error) {
        console.error( 'Fetch error:', error );
        return { props: { homePageCatalogList: photoData } };
    }
}

export default function Home( { homePageCatalogList } ) {
    const {
        isPhotographyPage,
        setCurrentCatalog
    } = useAppContext();

    console.log( homePageCatalogList );
    console.log( { homePageCatalogList } );


    return (
        <div className={styles.container}>
            <Header isPhotographyPage={isPhotographyPage}/>
            {isPhotographyPage && ( homePageCatalogList.length > 0 ) ?
                <PhotographyPage photoDataList={homePageCatalogList} setCurrentCatalog={setCurrentCatalog}/>
                : <CodingPage photoDataList={null} setCurrentCatalog={setCurrentCatalog}/>
            }
        </div>
    )
}
