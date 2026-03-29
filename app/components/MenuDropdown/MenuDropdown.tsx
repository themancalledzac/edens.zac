'use client';

import { CircleX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { About } from '@/app/components/About/About';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import GitHubIcon from '@/app/components/Icons/GitHubIcon';
import InstagramIcon from '@/app/components/Icons/InstagramIcon';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import { isLocalEnvironment } from '@/app/utils/environment';

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
  const router = useRouter();

  // Form/page state
  const [showContactForm, setShowContactForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);


  // Navigation handlers with automatic close
  const handleNavigation = {
    create: () => {
      router.push('/collection/manage');
      onClose();
    },
    update: () => {
      router.push(collectionSlug ? `/collection/manage/${collectionSlug}` : '/collection/manage');
      onClose();
    },
    blogs: () => {
      router.push('/collectionType/blogs');
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
  useBodyScrollLock(isOpen);

  // Reset forms/pages when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setShowContactForm(false);
      setShowAbout(false);
    }
  }, [isOpen]);

  // Preload About section image when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const img = new Image();
      img.src = '/_DSC0145.jpg';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div className={styles.dropdownCloseButtonWrapper}>
        <button
          type="button"
          className={styles.dropdownCloseButtonWrapper_button}
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <CircleX className={styles.dropdownCloseIcon} />
        </button>
      </div>

      <div className={styles.dropdownMenuOptionsWrapper}>
        <div className={styles.dropdownMenuItem}>
          <button
            type="button"
            className={styles.dropdownMenuButton}
            onClick={handleToggle.about}
          >
            <h2 className={styles.dropdownMenuOptions}>About</h2>
          </button>
        </div>

        {showAbout && (
          <About onBack={handleBackToMenu} />
        )}

        <div className={styles.dropdownMenuItem}>
          <button
            type="button"
            className={styles.dropdownMenuButton}
            onClick={handleToggle.contact}
          >
            <h2 className={styles.dropdownMenuOptions}>Contact</h2>
          </button>
        </div>

        {showContactForm && (
          <ContactForm
            onBack={handleBackToMenu}
            onSubmit={handleContactSubmit}
          />
        )}

        <div className={styles.dropdownMenuItem}>
          <button
            type="button"
            className={styles.dropdownMenuButton}
            onClick={handleNavigation.blogs}
          >
            <h2 className={styles.dropdownMenuOptions}>Blogs</h2>
          </button>
        </div>

        {isLocalEnvironment() && (pageType === 'collection' || pageType === 'collectionsCollection') && (
          <div className={styles.dropdownMenuItem}>
            <button
              type="button"
              className={styles.dropdownMenuButton}
              onClick={handleNavigation.create}
            >
              <h2 className={styles.dropdownMenuOptions}>Create</h2>
            </button>
          </div>
        )}

        {isLocalEnvironment() && pageType === 'collection' && (
          <div className={styles.dropdownMenuItem}>
            <button
              type="button"
              className={styles.dropdownMenuButton}
              onClick={handleNavigation.update}
            >
              <h2 className={styles.dropdownMenuOptions}>Update</h2>
            </button>
          </div>
        )}
      </div>

      <div className={`${styles.dropdownMenuItem} ${styles.dropdownMenuOptions} ${styles.socialIcons} ${styles.dropdownSocialIconsWrapper}`}>
        <button
          type="button"
          className={styles.socialIconButton}
          onClick={handleNavigation.instagram}
          aria-label="Visit Instagram"
        >
          <InstagramIcon size={32} />
        </button>
        <button
          type="button"
          className={styles.socialIconButton}
          onClick={handleNavigation.github}
          aria-label="Visit GitHub"
        >
          <GitHubIcon size={32} className={styles.githubIcon} />
        </button>
      </div>
    </div>
  );
}
