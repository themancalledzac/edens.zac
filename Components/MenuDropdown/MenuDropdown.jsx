import styles from "./MenuDropdown.module.scss";
import { CircleX, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import InstagramIcon from "../InstagramIcon/InstagramIcon";

export default function MenuDropdown( { dropdownRef, showDropdown, setShowDropdown } ) {
    const [aboutDropdownVisible, setAboutDropdownVisible] = useState( false );
    const [contactDropdownVisible, setContactDropdownVisible] = useState( false );
    const [formData, setFormData] = useState( { title: '', message: '' } );
    const [isMobile, setIsMobile] = useState( false );

    useEffect( () => {
        const checkMobile = () => {
            setIsMobile( window.innerWidth <= 768 ); // You can adjust this threshold
        };

        checkMobile(); // Check on initial load
        window.addEventListener( 'resize', checkMobile );

        return () => window.removeEventListener( 'resize', checkMobile );
    }, [] );

    const handleInputChange = ( e ) => {
        const { name, value } = e.target;
        setFormData( prevData => ( { ...prevData, [ name ]: value } ) );
        console.log( formData );
    };

    const generateMailToLink = () => {
        const encodedEmail = "ZWRlbnMuemFjQGdtYWlsLmNvbQ=="; // Base64 encoded email
        const email = atob( encodedEmail ); // Decode at runtime
        const subject = encodeURIComponent( formData.title );
        const body = encodeURIComponent( formData.message );
        return `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const handleSubmit = async ( e ) => {
        e.preventDefault();
        const mailToLink = generateMailToLink();
        if ( isMobile ) {
            // For mobile, just change the window location
            window.location.href = mailToLink;
        } else {
            window.open( mailToLink, '_blank', 'noopener,noreferrer' );
        }
    }

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
                        <div className={styles.dropdownSelectBoxWrapper}>
                            <div>Zechariah Edens</div>
                        </div>
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
                        <div className={styles.dropdownSelectBoxWrapper}>
                            <form className={styles.contactForm} onSubmit={handleSubmit}>
                                <input
                                    type="text"
                                    name="title"
                                    placeholder="Title"
                                    className={styles.contactFormTitle}
                                    value={formData.title}
                                    onChange={handleInputChange}
                                />
                                <textarea
                                    placeholder="Your message"
                                    name="message"
                                    className={styles.contactFormMessage}
                                    value={formData.message}
                                    onChange={handleInputChange}
                                />
                                <button type="submit" className={styles.contactFormSubmit}>
                                    Send
                                </button>
                            </form>
                        </div>
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