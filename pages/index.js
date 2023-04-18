// import Head from 'next/head'
// import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Parallax, ParallaxLayer } from '@react-spring/parallax';

export default function Home() {

    // TODO: link: https://webdesign.tutsplus.com/tutorials/create-a-masked-background-effect-with-css--cms-21112
    // TODO: a 'fixed background' scrolling effect

    return (
        <div className={styles.container}>
            <div className={styles.containerMain}>
                <div className={styles.main}>
                    <div className={styles.header}>
                        <a className={styles.icon}></a>
                        <a className={styles.icon}></a>
                        <a className={styles.icon}></a>
                    </div>
                    <div className={styles.mainCard}>

                        <h1 className={styles.title}>Zac</h1>
                        <h1 className={styles.title}>
                            <a>Edens</a>
                        </h1>
                        <paragraph className={styles.paragraph}>This is my About me yo. It will be hidden on load, or
                            easily openable. Lorem ipsum dolor sit amet, consectetur adipisicing
                            elit.
                            Dolor
                            eaque eligendi fuga ipsum
                            iste iure minima molestias natus, neque nisi odio possimus quam quo quos reiciendis
                            similique
                            suscipit! Ab aperiam architecto aut, eius ex exercitationem explicabo facere facilis itaque
                            iusto
                            labore maxime natus nulla quaerat quia quibusdam recusandae suscipit ullam!
                        </paragraph>
                    </div>
                    {/*TODO: These bottom cards need to be 'workCard' or something*/}
                    {/*TODO: They need to be slightly farther away from our main card.*/}
                    <div className={styles.mainCard}>
                        <h1 className={styles.title}>Photography</h1>
                    </div>
                    <div className={styles.mainCard}>
                        <h1 className={styles.title}>Coding</h1>
                    </div>
                </div>
            </div>
        </div>
    )
}
