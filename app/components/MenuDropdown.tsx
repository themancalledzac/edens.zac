'use client';

import { CircleX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import InstagramIcon from '@/Components/InstagramIcon/InstagramIcon';

import { About } from './About';
import { ContactForm } from './ContactForm';
import styles from './MenuDropdown.module.scss';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MenuDropdown({ isOpen, onClose }: MenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form/page state
  const [showContactForm, setShowContactForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  const handleInstagramClick = () => {
    window.open('https://instagram.com/themancalledzac', '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleBlogsClick = () => {
    window.location.href = '/blogs';
    onClose();
  };

  const handleAboutClick = () => {
    // Toggle About, close Contact if open
    setShowAbout(prev => !prev);
    setShowContactForm(false);
  };

  const handleContactClick = () => {
    // Toggle Contact, close About if open
    setShowContactForm(prev => !prev);
    setShowAbout(false);
  };

  const handleBackToMenu = () => {
    setShowContactForm(false);
    setShowAbout(false);
  };

  const handleContactSubmit = () => {
    // Close dropdown after successful contact form submission
    onClose();
  };

  // Click outside to close (desktop only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // Only close on click outside for desktop
        const isDesktop = window.innerWidth >= 768;
        if (isDesktop) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Body scroll lock when dropdown is open
  useEffect(() => {
    if (isOpen) {
      // Save current body overflow and lock scroll
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore original overflow when dropdown closes
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Reset forms/pages when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setShowContactForm(false);
      setShowAbout(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.dropdownCloseButtonWrapper}>
        <CircleX
          className={styles.dropdownCloseButton}
          onClick={onClose}
        />
      </div>

      <div className={styles.dropdownMenuOptionsWrapper}>
        <div className={styles.dropdownMenuItem}>
          <h2
            className={styles.dropdownMenuOptions}
            onClick={handleAboutClick}
          >
            About
          </h2>
        </div>

        {showAbout && (
          <About onBack={handleBackToMenu} />
        )}

        <div className={styles.dropdownMenuItem}>
          <h2
            className={styles.dropdownMenuOptions}
            onClick={handleContactClick}
          >
            Contact
          </h2>
        </div>

        {showContactForm && (
          <ContactForm
            onBack={handleBackToMenu}
            onSubmit={handleContactSubmit}
          />
        )}

        <div className={styles.dropdownMenuItem}>
          <h2
            className={styles.dropdownMenuOptions}
            onClick={() => handleItemClick(handleBlogsClick)}
          >
            Blogs
          </h2>
        </div>

        <div className={`${styles.dropdownMenuItem} ${styles.dropdownMenuOptions}`}>
          <InstagramIcon
            size={32}
            onClick={() => handleItemClick(handleInstagramClick)}
          />
        </div>
      </div>
    </div>
  );
}