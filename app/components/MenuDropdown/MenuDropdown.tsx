'use client';

import { CircleX } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useId, useRef, useState, useTransition } from 'react';

import { About } from '@/app/components/About/About';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import GitHubIcon from '@/app/components/Icons/GitHubIcon';
import InstagramIcon from '@/app/components/Icons/InstagramIcon';
import { NavLink } from '@/app/components/ui/NavLink/NavLink';
import { BREAKPOINTS } from '@/app/constants';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import { useFetchMe } from '@/app/hooks/useFetchMe';
import { clearCacheAction } from '@/app/lib/actions/clearCache';
import { logout } from '@/app/lib/api/auth';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { isLocalEnvironment } from '@/app/utils/environment';
import { manageHref } from '@/app/utils/manageUrl';

import styles from './MenuDropdown.module.scss';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  pageType?: 'default' | 'manage' | 'collection' | 'collectionsCollection';
  collectionSlug?: string;
  /** Applied to the overlay root so the trigger can point `aria-controls` at it. */
  id?: string;
}

/** Elements the focus trap treats as tabbable (mirrors the shared `Modal`). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Menu Dropdown
 *
 * Full-screen navigation overlay with expandable sections for About and Contact.
 *
 * Destinations are real `NavLink` anchors, so cmd-click / middle-click / open-in-new-tab and
 * Next's route prefetch all work; `onClick={onClose}` only dismisses the overlay. Only genuine
 * actions (log in/out, clear cache, the two disclosures) stay `<button>`s.
 *
 * Modal semantics are hand-rolled rather than delegated to the shared `Modal`: `Modal` paints a
 * scrim behind its dialog and sizes the dialog to the backdrop, which would darken the page behind
 * this menu and break the desktop-only click-outside-to-close. So this owns Escape, body scroll
 * lock, click-outside, focus trap, and focus restore directly.
 *
 * `aria-controls` on the disclosures is emitted only while the panel is mounted — a reference to a
 * non-existent id is an invalid ARIA value, and the panels are conditionally rendered. The panel
 * wrappers that carry those ids are `display: contents`, so About/ContactForm stay direct flex
 * children of the scroll container and the overlay's layout is unchanged.
 *
 * "Update" links to `/[slug]?manage=1`, the same route the page is already on, so the soft
 * navigation hands `CollectionPageClient` `editMode=true` without remounting it. No slug falls
 * back to the create surface.
 *
 * Public items (including Explore — the /explore taxonomy directory is
 * deliberately ungated, see proxy.ts) render for logged-out visitors; admin
 * items are gated on the `isAdmin` principal.
 *
 * @param isOpen - Controls dropdown visibility
 * @param onClose - Callback to close the dropdown
 */
export function MenuDropdown({
  isOpen,
  onClose,
  pageType = 'default',
  collectionSlug,
  id,
}: MenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const aboutPanelId = useId();
  const contactPanelId = useId();

  const [showContactForm, setShowContactForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isClearing, startClearing] = useTransition();

  const { me, loading: meLoading } = useFetchMe();
  const isAdmin = me?.isAdmin ?? false;

  const handleLogin = () => {
    router.push('/login');
    onClose();
  };

  const handleLogout = () => {
    // Best-effort: even if logout() rejects, the cookie may already be cleared —
    // refresh so server components re-render in the logged-out state.
    void (async () => {
      try {
        await logout();
      } catch {
        // swallow — proceed to refresh regardless
      }
      router.push('/');
      router.refresh();
      onClose();
    })();
  };

  const handleClearCache = () => {
    startClearing(async () => {
      const result = await clearCacheAction();
      if (result.ok) {
        collectionStorage.clearAll();
      }
      onClose();
    });
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

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const node = dropdownRef.current;
    if (!node) return;

    const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === node || !node.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !node.contains(active)) {
      event.preventDefault();
      first.focus();
    }
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
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useBodyScrollLock(isOpen);

  // Move focus into the overlay on open; hand it back to the trigger on close
  useEffect(() => {
    if (!isOpen) return;

    const active = document.activeElement;
    previouslyFocusedRef.current = active instanceof HTMLElement ? active : null;
    dropdownRef.current?.focus();

    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

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
    <div
      className={styles.dropdown}
      ref={dropdownRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
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
        {pathname !== '/' && (
          <div className={styles.dropdownMenuItem}>
            <NavLink href="/" className={styles.dropdownMenuLink} onClick={onClose}>
              <span className={styles.dropdownMenuOptions}>Home</span>
            </NavLink>
          </div>
        )}

        {!meLoading && me && (
          <>
            <div className={styles.dropdownMenuItem}>
              <NavLink href="/user" className={styles.dropdownMenuLink} onClick={onClose}>
                <span className={styles.dropdownMenuOptions}>Me</span>
              </NavLink>
            </div>
            <div className={styles.dropdownMenuItem}>
              <button type="button" className={styles.dropdownMenuButton} onClick={handleLogout}>
                <span className={styles.dropdownMenuOptions}>Log out</span>
              </button>
            </div>
          </>
        )}

        {!meLoading && !me && (
          <div className={styles.dropdownMenuItem}>
            <button type="button" className={styles.dropdownMenuButton} onClick={handleLogin}>
              <span className={styles.dropdownMenuOptions}>Log in</span>
            </button>
          </div>
        )}

        <div className={styles.dropdownMenuItem}>
          <button
            type="button"
            className={styles.dropdownMenuButton}
            onClick={handleToggle.about}
            aria-expanded={showAbout}
            aria-controls={showAbout ? aboutPanelId : undefined}
          >
            <span className={styles.dropdownMenuOptions}>About</span>
          </button>
        </div>

        {showAbout && (
          <div id={aboutPanelId} className={styles.disclosurePanel}>
            <About />
          </div>
        )}

        <div className={styles.dropdownMenuItem}>
          <button
            type="button"
            className={styles.dropdownMenuButton}
            onClick={handleToggle.contact}
            aria-expanded={showContactForm}
            aria-controls={showContactForm ? contactPanelId : undefined}
          >
            <span className={styles.dropdownMenuOptions}>Contact</span>
          </button>
        </div>

        {showContactForm && (
          <div id={contactPanelId} className={styles.disclosurePanel}>
            <ContactForm onSubmit={handleContactSubmit} />
          </div>
        )}

        <div className={styles.dropdownMenuItem}>
          <NavLink href="/explore" className={styles.dropdownMenuLink} onClick={onClose}>
            <span className={styles.dropdownMenuOptions}>Explore</span>
          </NavLink>
        </div>

        <div className={styles.dropdownMenuItem}>
          <NavLink href="/collections" className={styles.dropdownMenuLink} onClick={onClose}>
            <span className={styles.dropdownMenuOptions}>Collections</span>
          </NavLink>
        </div>

        {isAdmin && (
          <div className={styles.dropdownMenuItem}>
            <NavLink
              href="/collection/manage"
              className={styles.dropdownMenuLink}
              onClick={onClose}
            >
              <span className={styles.dropdownMenuOptions}>Create</span>
            </NavLink>
          </div>
        )}

        {isAdmin && pageType === 'collection' && (
          <div className={styles.dropdownMenuItem}>
            <NavLink
              href={collectionSlug ? manageHref(collectionSlug) : '/collection/manage'}
              className={styles.dropdownMenuLink}
              onClick={onClose}
            >
              <span className={styles.dropdownMenuOptions}>Update</span>
            </NavLink>
          </div>
        )}

        {isAdmin && (
          <div className={styles.dropdownMenuItem}>
            <NavLink href="/metadata" className={styles.dropdownMenuLink} onClick={onClose}>
              <span className={styles.dropdownMenuOptions}>Metadata</span>
            </NavLink>
          </div>
        )}

        {isAdmin && (
          <div className={styles.dropdownMenuItem}>
            <NavLink href="/comments" className={styles.dropdownMenuLink} onClick={onClose}>
              <span className={styles.dropdownMenuOptions}>Comments</span>
            </NavLink>
          </div>
        )}

        {isAdmin && (
          <div className={styles.dropdownMenuItem}>
            <NavLink href="/admin/roles" className={styles.dropdownMenuLink} onClick={onClose}>
              <span className={styles.dropdownMenuOptions}>Roles</span>
            </NavLink>
          </div>
        )}

        {/* Clear Cache stays local-only by choice: evicting the backend's
            in-process admin caches + nuking the Next route cache is a dev
            workflow tool, not something to surface on every prod page. Since
            BE 0207 the endpoint (/api/admin/cache/clear) exists in all
            profiles behind the /api/admin/** ADMIN gate, so this gating is
            product preference — no longer 404-avoidance. */}
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
        <a
          href="https://instagram.com/themancalledzac"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialIconButton}
          onClick={onClose}
          aria-label="Visit Instagram"
        >
          <InstagramIcon size={32} aria-hidden="true" />
        </a>
        <a
          href="https://github.com/themancalledzac"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialIconButton}
          onClick={onClose}
          aria-label="Visit GitHub"
        >
          <GitHubIcon size={32} className={styles.githubIcon} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
