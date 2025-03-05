import styles from '../styles/Home.module.scss'
import Header from "../Components/Header/Header";
import photoData from "../Images/homePagePhotoData.json";
import ParallaxSection from "@/Components/ParallaxSection/ParallaxSection";
import ParallaxSectionWrapper from "@/Components/ParallaxSectionWrapper";

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

    const catalogPairs = [];
    for (let i = 0; i < homePageCatalogList.length; i += 2) {
        catalogPairs.push(homePageCatalogList.slice(i, i + 2));
    }

    // TODO: Additional Elements will go here, along with our catalogPairs
    //  - Blog Home Page
    //  -
    //  -
    //  -

    return (
        <div className={styles.container}>
            <Header/>
            <div className={styles.bodyWrapper}>
                {catalogPairs.map((pair, index) => (
                    <ParallaxSectionWrapper key={index}>
                        {pair.map(({id, imageMain, name}) => (
                            <ParallaxSection
                                key={id}
                                catalogTitle={name}
                                bannerImage={imageMain.location}
                                image={imageMain}
                            />
                        ))}
                    </ParallaxSectionWrapper>
                ))}
            </div>
            {/*<Footer />*/}
        </div>
    )
};
