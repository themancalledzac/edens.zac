import { CircleX, Undo2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState } from 'react';

import { handleClick, handleInputChange, handleSubmit } from '@/Components/MenuDropdown/MenuUtils';
import { useAppContext } from '@/context/AppContext';
import { useEditContext } from '@/context/EditContext';
import { isLocalEnvironment } from '@/utils/environment';

import InstagramIcon from '../InstagramIcon/InstagramIcon';
import styles from './MenuDropdown.module.scss';

export default function MenuDropdown({ dropdownRef, showDropdown, setShowDropdown }) {
  const [aboutDropdownVisible, setAboutDropdownVisible] = useState(false);
  const [contactDropdownVisible, setContactDropdownVisible] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '' });
  const { isEditMode, setIsEditMode, isCreateMode, setIsCreateMode, handleCancelChanges } = useEditContext();
  const router = useRouter();

  const isMobile = useAppContext().isMobile;

  // Determine if we are on a catalog or blog page
  const isItemPage = router.query.slug as string;

  const handleUpdateClick = () => {
    setIsEditMode(!isEditMode);
    setShowDropdown(!showDropdown);
  };

  const handleSelectCreate = () => {
    setIsCreateMode(true);
    setIsEditMode(false);
    window.location.href = '/catalog/create';
    setShowDropdown(!showDropdown);
  };

  const adminMenu = () => {
    if (!isLocalEnvironment()) {
      return null;
    }

    return (
      <>
        {isItemPage && (
          (isEditMode || isCreateMode) ? (
            <div className={styles.dropdownMenuItem} onClick={handleCancelChanges}>
              <h2 className={styles.dropdownMenuOptions}>
                {isEditMode ? 'Cancel Update' : 'Cancel Create'}
              </h2>
            </div>
          ) : (
            <div className={styles.dropdownMenuItem} onClick={handleUpdateClick}>
              <h2 className={styles.dropdownMenuOptions}>
                Update
              </h2>
            </div>
          ))}
        {!isCreateMode && (
          <div className={styles.dropdownMenuItem} onClick={handleSelectCreate}>
            <h2 className={styles.dropdownMenuOptions}>Create</h2>
          </div>
        )}

        <div className={styles.dropdownMenuItem} onClick={() => handleClick('/cdn/catalog', router)}>
          <h2 className={styles.dropdownMenuOptions}>Catalogs</h2>
        </div>
        <div className={styles.dropdownMenuItem} onClick={() => handleClick('/cdn/search', router)}>
          <h2 className={styles.dropdownMenuOptions}>Tags</h2>
        </div>
      </>
    );
  };


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
    );
  };

  // TODO: Need to update our 'contact' email to be more intuitive.
  //  Maybe need to set up a 3rd party email that emails myself?
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
    );
  };

  const defaultMenu = () => {
    return (
      <div className={styles.dropdownMenuOptionsWrapper}>
        {isLocalEnvironment() && adminMenu()}
        <div className={styles.dropdownMenuItem}>
          <h2 className={styles.dropdownMenuItem}
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
    );
  };

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
  );
}
