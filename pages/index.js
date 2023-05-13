import styles from '../styles/Home.module.css'
import Image from 'next/image';
import SideBar from "../Components/SideBar";
import About from "../Components/About";
import { imageData } from "../Assets/imageData";
import CarouselImage from "../Components/CarouselImage";
import ImageCarousel from "../Components/ImageCarousel";


export default function Home() {

    // TODO: link: https://webdesign.tutsplus.com/tutorials/create-a-masked-background-effect-with-css--cms-21112
    // TODO: a 'fixed background' scrolling effect

    return (
        <div className={styles.container}>
            <SideBar/>
            <div className={styles.main}>
                <Image
                    src={require( '../public/000005530033.jpg' )}
                    alt="picture I took"
                />
                <About/>
                <ImageCarousel/>
                <div className={styles.header}>
                    <a className={styles.icon}>A</a>
                    <a className={styles.icon}>B</a>
                    <a className={styles.icon}>C</a>
                </div>
                <div className={styles.mainCard}>
                    <h1 className={styles.title}>Coding</h1>
                </div>
            </div>
        </div>
    )
}
