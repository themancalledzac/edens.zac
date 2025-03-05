import styles from "../../styles/Home.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection.js";

export default function CodingPage() {

    function getRandomElementFromArray(array) {
        const randomIndex = Math.floor(Math.random() * array.length);
        return array[randomIndex];
    }

    return (
        <div className={styles.bodyWrapper}>
            <div>coding</div>
        </div>
    )
};

