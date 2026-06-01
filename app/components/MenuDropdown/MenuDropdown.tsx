'use client';

import { CircleX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { About } from '@/app/components/About/About';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import GitHubIcon from '@/app/components/Icons/GitHubIcon';
import InstagramIcon from '@/app/components/Icons/InstagramIcon';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { BREAKPOINTS } from '@/app/constants';
import { useClickOutside } from '@/app/hooks/useClickOutside';
import { clearCacheAction } from '@/app/lib/actions/clearCache';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
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
  const [isClearing, startClearing] = useTransition();

  const handleClearCache = () => {
    startClearing(async () => {
      const result = await clearCacheAction();
      if (result.ok) {
        collectionStorage.clearAll();
      }
      onClose();
    });
  };

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

  const handleContactSubmit = () => {
    onClose();
  };

  // Desktop-only outside-click dismissal — mirrors the previous hand-rolled effect
  // (mobile intentionally does NOT close on an outside tap). The Modal owns Escape
  // and scroll-lock, so only the click-outside concern remains here.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= BREAKPOINTS.mobile);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useClickOutside(dropdownRef, isOpen && isDesktop, onClose);

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

  return (
    <Modal open={isOpen} onClose={onClose} variant="sheet">
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
            <button
              type="button"
              className={styles.dropdownMenuButton}
              onClick={handleToggle.about}
            >
              <span className={styles.dropdownMenuOptions}>About</span>
            </button>
          </div>

          {showAbout && <About />}

          <div className={styles.dropdownMenuItem}>
            <button
              type="button"
              className={styles.dropdownMenuButton}
              onClick={handleToggle.contact}
            >
              <span className={styles.dropdownMenuOptions}>Contact</span>
            </button>
          </div>

          {showContactForm && <ContactForm onSubmit={handleContactSubmit} />}

          {isLocalEnvironment() && (
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

          {isLocalEnvironment() && (
            <div className={styles.dropdownMenuItem}>
              <button
                type="button"
                className={styles.dropdownMenuButton}
                onClick={handleClearCache}
                disabled={isClearing}
              >
                <span className={styles.dropdownMenuOptions}>
                  {isClearing ? 'Clearing…' : 'Clear Cache'}
                </span>
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
    </Modal>
  );
}
