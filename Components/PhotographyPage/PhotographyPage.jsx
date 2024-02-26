import styles from "../../styles/Home.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";

export default function PhotographyPage( { projectStructure } ) {
    return (
        <div className={styles.bodyWrapper}>
            {projectStructure.map( ( imageLocation, index ) => (
                <ParallaxSection key={index} title={imageLocation.title} bannerImage={imageLocation.bannerImage}/>
            ) )}
        </div>
    )
};