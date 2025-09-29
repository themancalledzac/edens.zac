'use client';

import { CircleX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import InstagramIcon from '@/app/components/Icons/InstagramIcon';
import { isLocalEnvironment } from '@/app/utils/environment';

import { About } from '../About/About';
import { ContactForm } from '../ContactForm/ContactForm';
import GitHubIcon from '../Icons/GitHubIcon';
import styles from './MenuDropdown.module.scss';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  pageType?: 'default' | 'manage' | 'collection' | 'collectionsCollection';
  collectionSlug?: string;
}

/**
 * Menu Dropdown
 *
 * Full-screen navigation menu with expandable sections for About and Contact.
 * Features body scroll locking, click-outside-to-close on desktop, and
 * social media integration. Manages nested form states and navigation.
 *
 * @dependencies
 * - Lucide React CircleX icon for close button
 * - React hooks for state and lifecycle management
 * - About and ContactForm components for expandable sections
 * - InstagramIcon and GitHubIcon for social media links
 *
 * @param isOpen - Controls dropdown visibility state
 * @param onClose - Callback function to close the dropdown
 * @param pageType
 * @param collectionSlug
 * @returns Client component rendering full navigation menu overlay
 */
export function MenuDropdown({ isOpen, onClose, pageType = 'default', collectionSlug }: MenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form/page state
  const [showContactForm, setShowContactForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Show Update button only on localhost and for collectionsCollection pages
  const showUpdateButton = isLocalEnvironment() && pageType === 'collection';

  // Navigation handlers with automatic close
  const handleNavigation = {
    update: () => {
      window.location.href = collectionSlug ? `/collection/manage/${collectionSlug}` : '/collection/manage';
      onClose();
    },
    blogs: () => {
      window.location.href = '/blogs';
      onClose();
    },
    instagram: () => {
      window.open('https://instagram.com/themancalledzac', '_blank', 'noopener,noreferrer');
      onClose();
    },
    github: () => {
      window.open('https://github.com/themancalledzac', '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

  // Toggle handlers for expandable sections
  const handleToggle = {
    about: () => {
      setShowAbout(prev => !prev);
      setShowContactForm(false);
    },
    contact: () => {
      setShowContactForm(prev => !prev);
      setShowAbout(false);
    }
  };

  // Internal navigation handlers
  const handleBackToMenu = () => {
    setShowContactForm(false);
    setShowAbout(false);
  };

  const handleContactSubmit = () => {
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
        {showUpdateButton && (
          <div className={styles.dropdownMenuItem}>
            <h2
              className={styles.dropdownMenuOptions}
              onClick={handleNavigation.update}
            >
              Update
            </h2>
          </div>
        )}

        <div className={styles.dropdownMenuItem}>
          <h2
            className={styles.dropdownMenuOptions}
            onClick={handleToggle.about}
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
            onClick={handleToggle.contact}
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
            onClick={handleNavigation.blogs}
          >
            Blogs
          </h2>
        </div>

        <div className={`${styles.dropdownMenuItem} ${styles.dropdownMenuOptions} ${styles.socialIcons}`}>
          <InstagramIcon
            size={32}
            onClick={handleNavigation.instagram}
          />
          <GitHubIcon
            size={32}
            onClick={handleNavigation.github}
            className={styles.githubIcon}
          />
        </div>
      </div>
    </div>
  );
}