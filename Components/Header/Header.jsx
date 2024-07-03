import styles from "./Header.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { AlignJustify } from "lucide-react";

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
            <div className={styles.navBarWrapper}>
                <div className={styles.title} onClick={handleTitleClick}>
                    <h2>Zac Edens</h2>
                </div>
                {showDropdown && (
                    <div className={styles.dropdown} ref={dropdownRef}>
                        {/*<input type="text" placeholder="Search (not in use)" className={styles.searchBar}/>*/}
                        {/* Only exists when not on ('/') */}
                        <div>Home</div>
                        {/*  */}
                        <div>Projects</div>
                        <div>Prints</div>
                        {/* Contact needs to be a fill outable form. It should be just a clickable 'link' initially, that, when clicked, would take over the menu.  */}
                        <div>Contact</div>
                    </div>
                )}
                <AlignJustify
                    className={styles.menu}
                    onClick={() => setShowDropdown( !showDropdown )}/>
            </div>
        </header>
    );
};

