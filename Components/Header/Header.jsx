import styles from "./Header.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

export default function Header() {
    const { isPhotographyPage, setIsPhotographyPage } = useAppContext(); // Use context to get and set the page state
    const router = useRouter();
    const [showDropdown, setShowDropdown] = useState( false );
    const dropdownRef = useRef( null );
    const aboutRef = useRef( null );

    const handleTitleClick = () => {
        if ( router.pathname !== '/' ) {
            router.push( '/' );
        }
    }

    const handleCodingClick = () => {
        setIsPhotographyPage( false );
        if ( router.pathname !== '/' ) {
            router.push( '/' );
        }
    };

    const toggleDropdown = () => setShowDropdown( !showDropdown );

    useEffect( () => {
        const handleClickOutside = ( event ) => {
            if ( showDropdown && dropdownRef.current && !dropdownRef.current.contains( event.target ) &&
                aboutRef.current && !aboutRef.current.contains( event.target ) ) {
                setShowDropdown( false );
            }
        };

        document.addEventListener( 'mousedown', handleClickOutside );
        return () => document.removeEventListener( 'mousedown', handleClickOutside );
    }, [showDropdown] );

    return (
        <header className={styles.header}>
            <div className={styles.title} onClick={handleTitleClick}>
                <h2>Zac Edens</h2>
            </div>
            <div className={styles.navBarWrapper}>
                <div
                    className={`${styles.navBarLeft} ${!isPhotographyPage ? styles.expanded : styles.collapsed}`}
                    onClick={handleCodingClick}  // Use the new handleClick for the coding section
                >
                    {isPhotographyPage ? (
                        <h2 className={styles.text}>Coding</h2>
                    ) : (
                        <>
                            <h2 className={styles.textCentered}>Coding</h2>
                            <h2 className={styles.menu} ref={aboutRef} onClick={toggleDropdown}>About</h2>
                            {showDropdown && (
                                <div className={styles.dropdown} ref={dropdownRef}>
                                    <input type="text" placeholder="Search (not in use)" className={styles.searchBar}/>
                                    <div>About</div>
                                    <div>Projects</div>
                                    <div>Prints</div>
                                    <div>Contact</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div
                    className={`${styles.navBarRight} ${isPhotographyPage ? styles.expanded : styles.collapsed}`}
                    onClick={() => setIsPhotographyPage( true )}
                >
                    {!isPhotographyPage ? (
                        <h2 className={styles.text}>Photography</h2>
                    ) : (
                        <>
                            <h2 className={styles.textCentered}>Photography</h2>
                            <h2 className={styles.menu} ref={aboutRef} onClick={toggleDropdown}>About</h2>
                            {showDropdown && (
                                <div className={styles.dropdown} ref={dropdownRef}>
                                    <input type="text" placeholder="Search (not in use)" className={styles.searchBar}/>
                                    <div>About</div>
                                    <div>Projects</div>
                                    <div>Prints</div>
                                    <div>Contact</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

