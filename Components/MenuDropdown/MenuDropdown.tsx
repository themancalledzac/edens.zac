import styles from "./MenuDropdown.module.scss";
import {CircleX, Undo2} from "lucide-react";
import {useEffect, useState} from "react";
import InstagramIcon from "../InstagramIcon/InstagramIcon";
import {handleClick, handleInputChange, handleSubmit} from "@/Components/MenuDropdown/MenuUtils";
import {useRouter} from "next/router";
import {isLocalEnvironment} from "@/utils/environment";
import {MenuDropdownAdmin} from "@/Components/MenuDropdownAdmin/MenuDropdownAdmin";

export default function MenuDropdown({dropdownRef, showDropdown, setShowDropdown}) {
    const [aboutDropdownVisible, setAboutDropdownVisible] = useState(false);
    const [contactDropdownVisible, setContactDropdownVisible] = useState(false);
    const [formData, setFormData] = useState({title: '', message: ''});
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();


    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768); // You can adjust this threshold
        };

        checkMobile(); // Check on initial load
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // TODO: Update this so it uses our conditional rendering based on if Local
    // const adminMenu = () => {
    //     if (!isLocalEnvironment()) {
    //         return null;
    //     }
    //     // if (!isLocal) return null;
    //     return (
    //         <>
    //             <div className={styles.dropdownMenuItem} onClick={() => handleClick('/cdn/upload', router)}>
    //                 <h2 className={styles.dropdownMenuOptions}
    //                     onClick={() => setAboutDropdownVisible(!aboutDropdownVisible)}>Upload</h2>
    //             </div>
    //             <div className={styles.dropdownMenuItem} onClick={() => handleClick('/cdn/catalog', router)}>
    //                 <h2 className={styles.dropdownMenuOptions}
    //                     onClick={() => setAboutDropdownVisible(!aboutDropdownVisible)}>Catalogs</h2>
    //             </div>
    //             <div className={styles.dropdownMenuItem} onClick={() => handleClick('/cdn/search', router)}>
    //                 <h2 className={styles.dropdownMenuOptions}
    //                     onClick={() => setAboutDropdownVisible(!aboutDropdownVisible)}>Tags</h2>
    //             </div>
    //             <div className={styles.dropdownMenuItem} onClick={() => handleClick('/cdn/search', router)}>
    //                 <h2 className={styles.dropdownMenuOptions}
    //                     onClick={() => setAboutDropdownVisible(!aboutDropdownVisible)}>Search</h2>
    //             </div>
    //         </>
    //     )
    // }

    const aboutMenu = () => {
        return (
            <div className={styles.dropdownSubMenu}>
                <div className={styles.dropdownMenuOptionsWrapper}>
                    <div className={styles.dropdownMenuOption}>
                        <Undo2
                            className={styles.dropdownBackButton}
                            onClick={() => setAboutDropdownVisible(!aboutDropdownVisible)}
                        />
                        <h2>About</h2>
                    </div>
                    <div className={styles.dropdownSelectBoxWrapper}>
                        <div>Zechariah Edens</div>
                    </div>
                </div>
            </div>
        )
    }

    // TODO: Need to update our 'contact' email to be more intuitive. Maybe need to set up a 3rd party email that emails myself?
    // TODO: Investigate alternatives
    const contactMenu = () => {
        return (
            <div className={styles.dropdownSubMenu}>
                <div className={styles.dropdownMenuOptionsWrapper}>
                    <div className={styles.dropdownMenuOption}>
                        <Undo2
                            className={styles.dropdownBackButton}
                            onClick={() => setContactDropdownVisible(!contactDropdownVisible)}
                        />
                        <h2>Contact</h2>
                    </div>
                    <div className={styles.dropdownSelectBoxWrapper}>
                        <form
                            className={styles.contactForm}
                            onSubmit={(e) => handleSubmit(e, isMobile, formData)}
                        >
                            <input
                                type="text"
                                name="title"
                                placeholder="Title"
                                className={styles.contactFormTitle}
                                value={formData.title}
                                onChange={(e) => handleInputChange(e, setFormData, formData)}
                            />
                            <textarea
                                placeholder="Your message"
                                name="message"
                                className={styles.contactFormMessage}
                                value={formData.message}
                                onChange={(e) => handleInputChange(e, setFormData, formData)}
                            />
                            <button type="submit" className={styles.contactFormSubmit}>
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    const defaultMenu = () => {
        return (
            <div className={styles.dropdownMenuOptionsWrapper}>
                {isLocalEnvironment() &&
                    <MenuDropdownAdmin setAboutDropdownVisible={setAboutDropdownVisible}
                                       aboutDropdownVisible={aboutDropdownVisible}/>
                }
                <div className={styles.dropdownMenuItem}>
                    <h2 className={styles.dropdownMenuOptions}
                        onClick={() => setAboutDropdownVisible(!aboutDropdownVisible)}>About</h2>
                </div>
                <div className={styles.dropdownMenuItem}>
                    <h2 className={styles.dropdownMenuOptions}
                        onClick={() => setContactDropdownVisible(!contactDropdownVisible)}>Contact</h2>
                </div>
                <div className={`${styles.dropdownMenuItem} ${styles.dropdownMenuOptions}`}>
                    <InstagramIcon
                        size={32}
                        onClick={() =>
                            window.open('https://instagram.com/themancalledzac', '_blank', 'noopener,noreferrer')}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className={styles.dropdown} ref={dropdownRef}>
            <div className={styles.dropdownCloseButtonWrapper}>

                <CircleX
                    className={styles.dropdownCloseButton}
                    onClick={() => setShowDropdown(!showDropdown)}
                />
            </div>
            {aboutDropdownVisible && aboutMenu()}
            {contactDropdownVisible && contactMenu()}
            {!contactDropdownVisible && !aboutDropdownVisible && defaultMenu()}
        </div>
    )
}
