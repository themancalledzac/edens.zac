import styles from "./Header.module.scss";
import ParallaxSection from "../ParallaxSection/ParallaxSection";
import { useAppContext } from "../../context/AppContext";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { AlignJustify } from "lucide-react";


// TODO: Header Update
//  1. current view when Photography selected is our constant.
//  2. If we select coding, simply the TITLEs of the text changes,
//  along with the page
//  3. i.e., if coding is small and we click it, the text changes
//  from coding to photography, and the photography text in the MAIN
//  (read navBarRight) would change to coding.
//  4, This means the page layout stays constant, no need for expensive
//  animations to change, which also takes time and is sort of wonky
//  5. Buttons are dynamic, ifPhotographyPage && <div>photography</div> of sorts
//  6. Menu ends up in the SAME location the entire time
//  7. change 'about' to a Menu icon
//  8. take a look at https://www.npmjs.com/package/react-text-transition
//  9. Take a look at finding a Clock type animation change, where a mechanical
//  clock would flip almost like a playing card flipping overo


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

    const handleHeaderClick = () => {
        setIsPhotographyPage( !isPhotographyPage );
        if ( router.pathname !== '/' ) {
            router.push( '/' );
        }
    };

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

    // TODO: Update header bar to be all children of same navBarWrapper, rather than title being a sibling
    //  - Update Title and navBarLeft to be equal width, not change as the screen changes width
    //  - Change Menu to Icon
    //  - Update Menu so margin-right is equal to the rest of the page.
    return (
        <header className={styles.header}>
            <div className={styles.navBarWrapper}>
                <div className={styles.title} onClick={handleTitleClick}>
                    <h2>Zac Edens</h2>
                </div>
                {showDropdown && (
                    <div className={styles.dropdown} ref={dropdownRef}>
                        <input type="text" placeholder="Search (not in use)" className={styles.searchBar}/>
                        <div>About</div>
                        <div>Projects</div>
                        <div>Prints</div>
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

