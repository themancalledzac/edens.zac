import styles from '../styles/Home.module.scss'
import ParallaxSection from "../Components/ParallaxSection/ParallaxSection";
import imageDirectory from "../Images/imageDirectory.json";
import { useState } from "react";
import PhotographyPage from "../Components/PhotographyPage/PhotographyPage";

export default function Home() {
    const [isPhotographyPage, setIsPhotographyPage] = useState( true );

    // TODO: link: https://webdesign.tutsplus.com/tutorials/create-a-masked-background-effect-with-css--cms-21112
    // TODO: a 'fixed background' scrolling effect

    return (
        <div className={styles.container}>
            <div className={styles.navBarWrapper}>
                <div className={styles.navBarLeft}>
                    <h2>Zechariah Edens Portfolio</h2>
                    <h2>coding</h2>
                </div>
                <div className={styles.navBarRight}>
                    <h2>photography</h2>
                    <h2>About</h2>
                </div>
            </div>
            {isPhotographyPage ?
                <PhotographyPage/>
                : <></>}
        </div>
    )
}
