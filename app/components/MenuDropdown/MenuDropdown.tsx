'use client';

import { CircleX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { About } from '@/app/components/About/About';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import GitHubIcon from '@/app/components/Icons/GitHubIcon';
import InstagramIcon from '@/app/components/Icons/InstagramIcon';
import { BREAKPOINTS } from '@/app/constants';
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
 * @param isOpen - Controls dropdown visibility
 * @param onClose - Callback to close the dropdown
 */
export function MenuDropdown({
  isOpen,
  onClose,
  pageType = 'default',
  collectionSlug,
}: MenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [showContactForm, setShowContactForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleNavigation = {
    create: () => {
      router.push('/collection/manage');
      onClose();
    },
    update: () => {
      router.push(collectionSlug ? `/collection/manage/${collectionSlug}` : '/collection/manage');
      onClose();
    },
    metadata: () => {
      router.push('/metadata');
      onClose();
    },
    comments: () => {
      router.push('/comments');
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
    },
  };

  const handleToggle = {
    about: () => {
      setShowAbout(prev => !prev);
      setShowContactForm(false);
    },
    contact: () => {
      setShowContactForm(prev => !prev);
      setShowAbout(false);
    },
  };

  const handleBackToMenu = () => {
    setShowContactForm(false);
    setShowAbout(false);
  };

  const handleContactSubmit = () => {
    onClose();
  };

  // Click outside to close on desktop only
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const isDesktop = window.innerWidth >= BREAKPOINTS.mobile;
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

  // Escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useBodyScrollLock(isOpen);

  // Reset forms when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setShowContactForm(false);
      setShowAbout(false);
    }
  }, [isOpen]);

  // Preload About image on open to avoid layout shift
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
          <CircleX className={styles.dropdownCloseIcon} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.dropdownMenuOptionsWrapper}>
        <div className={styles.dropdownMenuItem}>
          <button type="button" className={styles.dropdownMenuButton} onClick={handleToggle.about}>
            <span className={styles.dropdownMenuOptions}>About</span>
          </button>
        </div>

        {showAbout && <About onBack={handleBackToMenu} />}

        <div className={styles.dropdownMenuItem}>
          <button
            type="button"
            className={styles.dropdownMenuButton}
            onClick={handleToggle.contact}
          >
            <span className={styles.dropdownMenuOptions}>Contact</span>
          </button>
        </div>

        {showContactForm && (
          <ContactForm onBack={handleBackToMenu} onSubmit={handleContactSubmit} />
        )}

        <div className={styles.dropdownMenuItem}>
          <button
            type="button"
            className={styles.dropdownMenuButton}
            onClick={handleNavigation.blogs}
          >
            <span className={styles.dropdownMenuOptions}>Blogs</span>
          </button>
        </div>

        {isLocalEnvironment() &&
          (pageType === 'collection' || pageType === 'collectionsCollection') && (
            <div className={styles.dropdownMenuItem}>
              <button
                type="button"
                className={styles.dropdownMenuButton}
                onClick={handleNavigation.create}
              >
                <span className={styles.dropdownMenuOptions}>Create</span>
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
              <span className={styles.dropdownMenuOptions}>Update</span>
            </button>
          </div>
        )}

        {isLocalEnvironment() && (
          <div className={styles.dropdownMenuItem}>
            <button
              type="button"
              className={styles.dropdownMenuButton}
              onClick={handleNavigation.metadata}
            >
              <span className={styles.dropdownMenuOptions}>Metadata</span>
            </button>
          </div>
        )}

        {isLocalEnvironment() && (
          <div className={styles.dropdownMenuItem}>
            <button
              type="button"
              className={styles.dropdownMenuButton}
              onClick={handleNavigation.comments}
            >
              <span className={styles.dropdownMenuOptions}>Comments</span>
            </button>
          </div>
        )}
      </div>

      <div
        className={`${styles.dropdownMenuItem} ${styles.dropdownMenuOptions} ${styles.socialIcons} ${styles.dropdownSocialIconsWrapper}`}
      >
        <button
          type="button"
          className={styles.socialIconButton}
          onClick={handleNavigation.instagram}
          aria-label="Visit Instagram"
        >
          <InstagramIcon size={32} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.socialIconButton}
          onClick={handleNavigation.github}
          aria-label="Visit GitHub"
        >
          <GitHubIcon size={32} className={styles.githubIcon} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
