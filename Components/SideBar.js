import styles from "../styles/Home.module.css";
import { sideBarData } from "../Assets/sideBarData";
import CancelIcon from "@mui/icons-material/Cancel";
import BungalowIcon from "@mui/icons-material/Bungalow";
import CameraEnhanceIcon from "@mui/icons-material/CameraEnhance";

export default function SideBar() {
    return (
        <div className={styles.sidebar}>
            <div>

                <h1 className={styles.name}>Zac Edens</h1>
            </div>
            <div className={styles.menu}>
                {sideBarData.map( ( item ) => (
                    <div key={item.title} className={styles.menuItem}>
                        <a className={styles.sideBarButton}>
                            {item.title}
                        </a>
                    </div>
                ) )}
            </div>
            <CancelIcon/>
            <br/>
            <BungalowIcon/>
            <br/>
            <CameraEnhanceIcon/>
        </div>
    )
};
