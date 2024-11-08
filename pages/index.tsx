import styles from '../styles/Home.module.scss'
import Header from "../Components/Header/Header";
import photoData from "../Images/homePagePhotoData.json";
import ParallaxSection from "@/Components/ParallaxSection/ParallaxSection";

export async function getServerSideProps() {
    const url = 'http://localhost:8080/api/v1/catalog/mainPageCatalogList/test';
    try {
        const response = await fetch(url, {cache: 'force-cache'});
        const data = await response.json();
        const sortedData = data.sort((a, b) => a.priority - b.priority);
        return {props: {homePageCatalogList: sortedData}};
    } catch (error) {
        console.error('Fetch error:', error);
        return {props: {homePageCatalogList: photoData}};
    }
}

export default function Home({homePageCatalogList}) {

    return (
        <div className={styles.container}>
            <Header/>
            <div className={styles.bodyWrapper}>
                {/* TODO: Additional Elements go in here. Do we make them PART of our .map below? for Dynamic organization...*/}
                {homePageCatalogList.map(({id, imageMain, name}) => (
                    <ParallaxSection key={id} catalogTitle={name}
                                     bannerImage={imageMain.location} image={imageMain}/>
                ))}
            </div>
            {/*<Footer />*/}
        </div>
    )
};
