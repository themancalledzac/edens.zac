import styles from "../../styles/Home.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";

export default function PhotographyPage({homePageCatalogList}) {

    console.log({homePageCatalogList})

    return (
        <div className={styles.bodyWrapper}>
            {/* TODO: Additional Elements go in here. Do we make them PART of our .map below? for Dynamic organization...*/}
            {/*<div className={styles.photoHeader}>*/}
            {/*    <h1 className={styles.photoHeaderTitle}>Zac</h1>*/}
            {/*</div>*/}
            {homePageCatalogList.map(({id, imageMain, name}) => (
                <ParallaxSection key={id} catalogTitle={name}
                                 bannerImage={imageMain.location} image={imageMain}/>
            ))}
        </div>
    )
};


