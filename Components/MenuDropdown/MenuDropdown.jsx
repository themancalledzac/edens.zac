import styles from "../Header/Header.module.scss";
import { CircleX, Instagram } from "lucide-react";
import { useState } from "react";

export default function MenuDropdown( { dropdownRef, showDropdown, setShowDropdown } ) {
    const [aboutDropdownVisible, setAboutDropdownVisible] = useState( false );

    return (
        <div className={styles.dropdown} ref={dropdownRef}>
            <div className={styles.dropdownCloseButtonWrapper}>

                <CircleX
                    className={styles.dropdownCloseButton}
                    onClick={() => setShowDropdown( !showDropdown )}
                />
            </div>
            <div className={styles.dropdownMenuOptions}
                 onClick={() => ( setAboutDropdownVisible( !aboutDropdownVisible ) )}>About
            </div>
            <div className={styles.dropdownMenuOptions}>Contact</div>
            <div className={styles.dropdownMenuOptions}>
                <Instagram onClick={() => window.location.href = 'https://instagram.com/themancalledzac'}/>
            </div>
        </div>
    )
}

// TODO:
//  1. About Dropdown
//   - OnClick => open AboutContainer
//   - OpenContainer should take over entire space of Dropdown
//   -
//   -
//  2. Contact Dropdown