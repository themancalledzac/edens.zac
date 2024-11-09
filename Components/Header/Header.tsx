import styles from "./Header.module.scss";
import {useRouter} from "next/router";
import {useEffect, useRef, useState} from "react";
import {AlignJustify} from "lucide-react";
import MenuDropdown from "../MenuDropdown/MenuDropdown";

/**
 * Header Component for all pages
 * @constructor
 */
export default function Header() {
    const router = useRouter();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const aboutRef = useRef(null);

    const handleClick = (page: string) => {
        try {
            router.push(`/${page}`);
        } catch (e) {
            console.error(`Error fetching ${page} page. ${e}`);
        }
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                aboutRef.current && !aboutRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    // TODO: Update Header:
    //  1. Move menuItems into dropdown(pull out) menu
    //  2. Verify that
    return (
        <header className={styles.header}>
            <div className={styles.navBarWrapper}>
                <div className={styles.navBarLeftWrapper}>

                    <div className={styles.title} onClick={() => handleClick('')}>
                        <h2>Zac Edens</h2>
                    </div>
                </div>
                {showDropdown ? (
                    <MenuDropdown dropdownRef={dropdownRef} showDropdown={showDropdown}
                                  setShowDropdown={setShowDropdown}/>
                ) : (
                    <AlignJustify
                        className={styles.menu}
                        onClick={() => setShowDropdown(!showDropdown)}/>
                )}
            </div>
        </header>
    );
};
