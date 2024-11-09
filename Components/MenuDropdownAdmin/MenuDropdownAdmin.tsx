import {isLocalEnvironment} from "@/utils/environment";
import styles from "@/Components/MenuDropdown/MenuDropdown.module.scss";
import {handleClick} from "@/Components/MenuDropdown/MenuUtils";
import {useRouter} from "next/router";

export const MenuDropdownAdmin = ({setAboutDropdownVisible, aboutDropdownVisible}) => {
    const router = useRouter();

    if (!isLocalEnvironment()) {
        return null;
    }
    // if (!isLocal) return null;
    return (
        <>
            <div className={styles.dropdownMenuItem} onClick={() => handleClick('cdn/upload', router)}>
                <h2 className={styles.dropdownMenuOptions}>Upload</h2>
            </div>
            <div className={styles.dropdownMenuItem} onClick={() => handleClick('cdn/catalog', router)}>
                <h2 className={styles.dropdownMenuOptions}>Catalogs</h2>
            </div>
            <div className={styles.dropdownMenuItem} onClick={() => handleClick('cdn/search', router)}>
                <h2 className={styles.dropdownMenuOptions}>Tags</h2>
            </div>
            <div className={styles.dropdownMenuItem} onClick={() => handleClick('cdn/search', router)}>
                <h2 className={styles.dropdownMenuOptions}>Search</h2>
            </div>
        </>
    )
}