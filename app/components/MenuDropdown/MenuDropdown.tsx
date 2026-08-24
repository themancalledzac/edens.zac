'use client';

import { CircleX } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useRef, useState, useTransition } from 'react';

import { About } from '@/app/components/About/About';
import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import GitHubIcon from '@/app/components/Icons/GitHubIcon';
import InstagramIcon from '@/app/components/Icons/InstagramIcon';
import { Disclosure } from '@/app/components/ui/Disclosure/Disclosure';
import { NavLink } from '@/app/components/ui/NavLink/NavLink';
import { BREAKPOINTS } from '@/app/constants';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
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
 * Skin for the two `Disclosure` rows. No `headingLevel`: these are menu items inside a labelled
 * `dialog`, not sections of the document outline, so a heading here would be a phantom level.
 */
const disclosureClassNames = {
  header: styles.dropdownMenuItem,
  toggle: styles.dropdownMenuButton,
  chevron: styles.disclosureChevron,
  panel: styles.disclosurePanel,
};

/**
 * One destination row in the overlay.
 *
 * `show` is a plain boolean rather than a predicate because every gate reads state the component
 * already has in scope; the arrays are rebuilt each render, so the gates re-evaluate anyway.
 * `label` doubles as the React key — the labels are the user-visible menu text and are unique.
 */
interface MenuNavItem {
  label: string;
  href: string;
  show: boolean;
}

/**
 * Hands focus back when the overlay closes.
 *
 * The element that opened the menu is preferred, but `.focus()` on a node that has left the
 * document is a silent no-op that leaves focus on `<body>` — one Tab from there restarts the whole
 * page. So when the trigger unmounted while the menu was open (a route change that remounts the
 * header, say), fall back to the first control in the page header: the same corner of the page the
 * trigger lived in, so the tab order resumes roughly where the user left it.
 *
 * If the document has no header either, there is genuinely nothing to restore to and this does
 * nothing rather than inventing a target.
 */
function restoreFocus(previous: HTMLElement | null) {
  if (previous?.isConnected) {
    previous.focus();
    return;
  }
  document.querySelector('header')?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
}

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
 * this menu and break the desktop-only click-outside-to-close. Those are the only two reasons —
 * `Modal` does not touch the `fullscreen-open` body class (that is `FullScreenModal`'s, applied
 * outside the primitive). So this owns Escape, body scroll lock, click-outside, focus trap, and
 * focus restore directly.
 *
 * Escape ignores `isComposing` keydowns: dismissing an IME candidate list is a cancel inside the
 * ContactForm's inputs, not a request to tear the whole menu down and discard the draft.
 *
 * About and Contact are the shared `Disclosure` primitive, which owns the generated panel id,
 * `aria-expanded`, and the `aria-controls` that is emitted only while the panel is mounted. Its
 * chevron is hidden here (`.disclosureChevron`): the rows are right-aligned display type with no
 * affordance glyph on any other item, and it is `aria-hidden` decoration, so hiding it costs
 * nothing a screen reader can hear. The panel wrappers that carry the ids are `display: contents`,
 * so About/ContactForm stay direct flex children of the scroll container and the layout is
 * unchanged.
 *
 * Clear Cache goes `aria-disabled` rather than `disabled` while its action is in flight. Disabling
 * the focused button drops focus to `<body>`, and the Tab trap is a handler on the overlay root —
 * once focus is out there no keydown reaches it and Tab walks the `aria-modal`'d page behind the
 * overlay. Staying focusable keeps focus inside; the handler guards the pending state itself.
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
    // refresh so server components re-render in the logged-out state. The panel cache
    // goes unconditionally for the same reason: admin emails and message bodies must
    // not survive on a browser whose session may already be gone.
    void (async () => {
      try {
        await logout();
      } catch {
        // swallow — proceed to refresh regardless
      }
      clearCachedPanelData();
      router.push('/');
      router.refresh();
      onClose();
    })();
  };

  const handleClearCache = () => {
    if (isClearing) return;

    startClearing(async () => {
      const result = await clearCacheAction();
      if (result.ok) {
        collectionStorage.clearAll();
      }
      onClose();
    });
  };

  const handleToggle = {
    about: (open: boolean) => {
      setShowAbout(open);
      setShowContactForm(false);
    },
    contact: (open: boolean) => {
      setShowContactForm(open);
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
      if (event.key === 'Escape' && !event.isComposing && isOpen) {
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
      restoreFocus(previouslyFocusedRef.current);
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

  const primaryNavItems: MenuNavItem[] = [
    { label: 'Home', href: '/', show: pathname !== '/' },
    { label: 'Me', href: '/user', show: !meLoading && Boolean(me) },
  ];

  const secondaryNavItems: MenuNavItem[] = [
    { label: 'Explore', href: '/explore', show: true },
    { label: 'Collections', href: '/collections', show: true },
    { label: 'Create', href: '/collection/manage', show: isAdmin },
    {
      label: 'Update',
      href: collectionSlug ? manageHref(collectionSlug) : '/collection/manage',
      show: isAdmin && pageType === 'collection',
    },
    { label: 'Metadata', href: '/metadata', show: isAdmin },
    { label: 'Comments', href: '/comments', show: isAdmin },
    { label: 'Admin', href: '/admin', show: isAdmin },
  ];

  const renderNavItems = (items: MenuNavItem[]) =>
    items
      .filter(item => item.show)
      .map(item => (
        <div key={item.label} className={styles.dropdownMenuItem}>
          <NavLink href={item.href} className={styles.dropdownMenuLink} onClick={onClose}>
            <span className={styles.dropdownMenuOptions}>{item.label}</span>
          </NavLink>
        </div>
      ));

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
        {renderNavItems(primaryNavItems)}

        {!meLoading && me && (
          <div className={styles.dropdownMenuItem}>
            <button type="button" className={styles.dropdownMenuButton} onClick={handleLogout}>
              <span className={styles.dropdownMenuOptions}>Log out</span>
            </button>
          </div>
        )}

        {!meLoading && !me && (
          <div className={styles.dropdownMenuItem}>
            <button type="button" className={styles.dropdownMenuButton} onClick={handleLogin}>
              <span className={styles.dropdownMenuOptions}>Log in</span>
            </button>
          </div>
        )}

        <Disclosure
          title={<span className={styles.dropdownMenuOptions}>About</span>}
          open={showAbout}
          onOpenChange={handleToggle.about}
          classNames={disclosureClassNames}
        >
          <About />
        </Disclosure>

        <Disclosure
          title={<span className={styles.dropdownMenuOptions}>Contact</span>}
          open={showContactForm}
          onOpenChange={handleToggle.contact}
          classNames={disclosureClassNames}
        >
          <ContactForm onSubmit={handleContactSubmit} />
        </Disclosure>

        {renderNavItems(secondaryNavItems)}

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
              aria-disabled={isClearing || undefined}
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
