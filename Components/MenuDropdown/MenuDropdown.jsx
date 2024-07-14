import styles from "./MenuDropdown.module.scss";
import { CircleX, Undo2 } from "lucide-react";
import { useState } from "react";
import InstagramIcon from "../InstagramIcon/InstagramIcon";

export default function MenuDropdown( { dropdownRef, showDropdown, setShowDropdown } ) {
    const [aboutDropdownVisible, setAboutDropdownVisible] = useState( false );
    const [contactDropdownVisible, setContactDropdownVisible] = useState( false );

    return (
        <div className={styles.dropdown} ref={dropdownRef}>
            <div className={styles.dropdownCloseButtonWrapper}>

                <CircleX
                    className={styles.dropdownCloseButton}
                    onClick={() => setShowDropdown( !showDropdown )}
                />
            </div>
            {aboutDropdownVisible ? (
                <div className={styles.dropdownSubMenu}>
                    <div className={styles.dropdownMenuOptionsWrapper}>
                        <div className={styles.dropdownMenuOption}>
                            <Undo2
                                className={styles.dropdownBackButton}
                                onClick={() => setAboutDropdownVisible( !aboutDropdownVisible )}
                            />
                            <h2>About</h2>
                        </div>
                        {/* Add your about content here */}
                    </div>
                </div>
            ) : contactDropdownVisible ? (
                <div className={styles.dropdownSubMenu}>
                    <div className={styles.dropdownMenuOptionsWrapper}>
                        <div className={styles.dropdownMenuOption}>
                            <Undo2
                                className={styles.dropdownBackButton}
                                onClick={() => setContactDropdownVisible( !contactDropdownVisible )}
                            />
                            <h2>Contact</h2>
                        </div>
                        {/* Add your contact content here */}
                    </div>
                </div>
            ) : (
                <div className={styles.dropdownMenuOptionsWrapper}>
                    <div className={styles.dropdownMenuItem}>
                        <h2 className={styles.dropdownMenuOptions}
                            onClick={() => setAboutDropdownVisible( !aboutDropdownVisible )}>About</h2>
                    </div>
                    <div className={styles.dropdownMenuItem}>
                        <h2 className={styles.dropdownMenuOptions}
                            onClick={() => setContactDropdownVisible( !contactDropdownVisible )}>Contact</h2>
                    </div>
                    <div className={`${styles.dropdownMenuItem} ${styles.dropdownMenuOptions}`}>
                        <InstagramIcon
                            size={32}
                            onClick={() =>
                                window.open( 'https://instagram.com/themancalledzac', '_blank', 'noopener,noreferrer' )}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// TODO:
// 1. About Dropdown
// - OnClick => open AboutContainer
// - OpenContainer should take over entire space of Dropdown
// -
// -
// 2. Contact Dropdown