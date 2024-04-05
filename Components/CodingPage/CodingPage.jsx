import styles from "../../styles/Home.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";

export default function CodingPage( { photoDataList, setCurrentAdventure } ) {

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
            {/*{photoDataList.map( ( { adventure, images, index } ) => (*/}
            {photoDataList.map( ( { id, imageMain, name } ) => (
                <ParallaxSection key={id} title={name} setCurrentAdventure={setCurrentAdventure}
                                 bannerImage={imageMain.title} image={imageMain}/>
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

