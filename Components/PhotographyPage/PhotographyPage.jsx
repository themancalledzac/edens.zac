import styles from "../../styles/Home.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";
import Footer from "../Footer/Footer";

export default function PhotographyPage( { photoDataList, setCurrentCatalog } ) {

    function getRandomElementFromArray( array ) {
        const randomIndex = Math.floor( Math.random() * array.length );
        return array[ randomIndex ];
    }

    return (
        <div className={styles.bodyWrapper}>
            {/* TODO: Additional Elements go in here. Do we make them PART of our .map below? for Dynamic organization...*/}
            {/*<div className={styles.photoHeader}>*/}
            {/*    <h1 className={styles.photoHeaderTitle}>Zac</h1>*/}
            {/*</div>*/}
            {photoDataList.map( ( { id, imageMain, name } ) => (
                <ParallaxSection key={id} catalogTitle={name} setCurrentCatalog={setCurrentCatalog}
                                 bannerImage={imageMain.title} image={imageMain}/>
            ) )}
            <Footer/>
        </div>
    )
};


