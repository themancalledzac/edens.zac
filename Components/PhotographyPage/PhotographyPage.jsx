import styles from "../../styles/Home.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";

export default function PhotographyPage( { projectStructure } ) {
    return (
        <div className={styles.bodyWrapper}>
            {/* TODO: Additional Elements go in here. Do we make them PART of our .map below? for Dynamic organization...*/}
            {/*<div className={styles.photoHeader}>*/}
            {/*    <h1 className={styles.photoHeaderTitle}>Zac</h1>*/}
            {/*</div>*/}
            {projectStructure.map( ( imageLocation, index ) => (
                <ParallaxSection key={index} title={imageLocation.title} bannerImage={imageLocation.bannerImage}/>
            ) )}
            <div className={styles.footer}>
                <a className={styles.title}>edens.zac production</a>
                <a>instagram</a>
                <a>email</a>
                <a></a>
            </div>
        </div>
    )
};