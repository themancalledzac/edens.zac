import { ImageListItem } from "@mui/material";
import MainImage from "../public/000005530033.jpg";
import styles from "../styles/Home.module.css";

export default function About() {
    return (
        <div className={styles.mainCard}>

            <h1 className={styles.title}>Zac</h1>
            <h1 className={styles.title}>
                <a>Edens</a>
            </h1>
            <paragraph className={styles.aboutParagraph}>This is my About me yo. It will be hidden on load, or
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
    )

}