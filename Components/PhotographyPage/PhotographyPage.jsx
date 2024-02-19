import styles from "../../styles/Home.module.scss";
import imageDirectory from "../../Images/imageDirectory.json";
import ParallaxSection from "../ParallaxSection/ParallaxSection";

export default function PhotographyPage() {
    return (
        <div className={styles.bodyWrapper}>
            {imageDirectory.map( ( imageLocation, index ) => (
                <ParallaxSection key={index} title={`Section ${index + 1}`} imageLocation={imageLocation}/>
            ) )}
        </div>
    )
};