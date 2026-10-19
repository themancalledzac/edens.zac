'use client';

import { CircleX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type PointerEvent, useEffect, useId, useRef, useState, useTransition } from 'react';

import { About } from '@/app/components/About/About';
import GitHubIcon from '@/app/components/Icons/GitHubIcon';
import InstagramIcon from '@/app/components/Icons/InstagramIcon';
import { CopyrightYear } from '@/app/components/MenuDropdown/CopyrightYear';
import { ContactModal } from '@/app/components/Personal/ContactChip';
import { Disclosure } from '@/app/components/ui/Disclosure/Disclosure';
import { NavLink } from '@/app/components/ui/NavLink/NavLink';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { useDialogFocus } from '@/app/hooks/useDialogFocus';
import { useFetchMe } from '@/app/hooks/useFetchMe';
import { useSwipeToClose } from '@/app/hooks/useSwipeToClose';
import { clearCacheAction } from '@/app/lib/actions/clearCache';
import { logout } from '@/app/lib/api/auth';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type MeResponse } from '@/app/types/Auth';
import { isLocalEnvironment } from '@/app/utils/environment';
import { manageHref } from '@/app/utils/manageUrl';

import styles from './MenuDropdown.module.scss';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  /** True on a single collection's page, where an admin gets the Update item. */
  isCollectionPage?: boolean;
  collectionSlug?: string;
  /** Applied to the overlay root so the trigger can point `aria-controls` at it. */
  id?: string;
  /** Server-resolved principal: undefined fetches on first open, null is anonymous. */
  me?: MeResponse | null;
}

const BOTTOM_BAR_TABBABLE = '[data-bottom-nav] a[href], [data-bottom-nav] button:not([disabled])';

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
 * Menu Dropdown
 *
 * Navigation overlay: a sheet under 768px that fills the viewport above the bottom bar, a
 * top-right panel above. On phones the bar stays visible and its Menu cell turns into the close X
 * (this component hides its own X there), the bar's controls join the focus trap
 * (`alsoTabbable`), and a downward swipe closes the sheet (`useSwipeToClose`); the socials and
 * copyright row moves to the top. It has an expandable About section and a Contact row that
 * closes the menu and opens the shared `ContactModal`.
 *
 * Destinations are real `NavLink` anchors, so cmd-click / middle-click / open-in-new-tab and
 * Next's route prefetch all work; `onClick={onClose}` only dismisses the overlay. Only genuine
 * actions (log in/out, clear cache, Contact, the About disclosure) stay `<button>`s.
 *
 * Modal semantics are hand-rolled rather than delegated to the shared `Modal`: `Modal` paints a
 * scrim behind its dialog and sizes the dialog to the backdrop, which would darken the page behind
 * this menu and break click-outside-to-close. Those are the only two reasons —
 * `Modal` does not touch the `fullscreen-open` body class (that is `FullScreenModal`'s, applied
 * outside the primitive). So this owns click-outside itself and gets Escape, body scroll lock,
 * focus trap, and focus restore from `useDialogFocus`. Click-outside ignores mousedowns inside
 * `[data-bottom-nav]`, so the bar's Menu cell toggles the menu instead of reopening it.
 *
 * About is the shared `Disclosure` primitive, which owns the generated panel id,
 * `aria-expanded`, and the `aria-controls` that is emitted only while the panel is mounted. Its
 * chevron is hidden here (`.disclosureChevron`): the rows are right-aligned display type with no
 * affordance glyph on any other item, and it is `aria-hidden` decoration, so hiding it costs
 * nothing a screen reader can hear. The panel wrapper that carries the id is `display: contents`,
 * so About stays a direct flex child of the scroll container and the layout is unchanged.
 *
 * Clear Cache renders only in a local environment by product choice: it is a dev workflow tool,
 * not something for every prod page, though the endpoint exists in every profile. It goes
 * `aria-disabled` rather than `disabled` while its action is in flight. Disabling the focused
 * button drops focus to `<body>`, and the Tab trap is a handler on the overlay root — once focus
 * is out there no keydown reaches it and Tab walks the `aria-modal`'d page behind the overlay.
 * Staying focusable keeps focus inside; the handler guards the pending state itself.
 *
 * Log out refreshes and clears the cached panel data even when `logout()` rejects: the cookie may
 * already be gone, and admin emails or message bodies must not outlive the session in the browser.
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
  isCollectionPage = false,
  collectionSlug,
  id,
  me: initialMe,
}: MenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { onKeyDown } = useDialogFocus(dropdownRef, isOpen, onClose, {
    escape: 'document',
    respectAutoFocus: false,
    alsoTabbable: BOTTOM_BAR_TABBABLE,
  });

  const [showContact, setShowContact] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isClearing, startClearing] = useTransition();
  const adminLabelId = useId();
  const swipe = useSwipeToClose(dropdownRef, { enabled: isOpen, onClose });

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia?.('(width < 768px)').matches) swipe.onPointerDown(event);
  };

  const [hasOpened, setHasOpened] = useState(isOpen);
  if (isOpen && !hasOpened) setHasOpened(true);

  const { me, loading: meLoading } = useFetchMe({ initialMe, enabled: hasOpened });
  const isAdmin = me?.isAdmin ?? false;

  const handleLogout = () => {
    void (async () => {
      await logout().catch(() => {});
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

  const handleOpenContact = () => {
    setShowContact(true);
    onClose();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !target.closest('[data-bottom-nav]')
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setShowAbout(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const img = new Image();
      img.src = '/_DSC0145.jpg';
    }
  }, [isOpen]);

  const contactModal = (
    <ContactModal
      open={showContact}
      onClose={() => setShowContact(false)}
      lockedEmail={me?.email}
    />
  );

  if (!isOpen) return contactModal;

  const browseNavItems: MenuNavItem[] = [
    { label: 'Explore', href: '/explore', show: true },
    { label: 'Collections', href: '/collections', show: true },
    {
      label: 'Your space',
      href: me?.isAdmin ? '/admin' : '/user',
      show: !meLoading && Boolean(me),
    },
    { label: 'Log in', href: '/login', show: !meLoading && !me },
  ];

  const adminNavItems: MenuNavItem[] = [
    { label: 'Create', href: '/collection/manage', show: isAdmin },
    {
      label: 'Update',
      href: collectionSlug ? manageHref(collectionSlug) : '/collection/manage',
      show: isAdmin && isCollectionPage,
    },
    { label: 'Metadata', href: '/metadata', show: isAdmin },
    { label: 'Comments', href: '/comments', show: isAdmin },
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
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <div
        className={`${styles.dropdown} ${styles.sheet}`}
        ref={dropdownRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
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
          {renderNavItems(browseNavItems)}

          <Disclosure
            title={<span className={styles.dropdownMenuOptions}>About</span>}
            open={showAbout}
            onOpenChange={setShowAbout}
            classNames={disclosureClassNames}
          >
            <About />
          </Disclosure>

          <div className={styles.dropdownMenuItem}>
            <button type="button" className={styles.dropdownMenuButton} onClick={handleOpenContact}>
              <span className={styles.dropdownMenuOptions}>Contact</span>
            </button>
          </div>

          {isAdmin && (
            <div role="group" aria-labelledby={adminLabelId} className={styles.adminGroup}>
              <p id={adminLabelId} className={styles.adminLabel}>
                Admin
              </p>
              {renderNavItems(adminNavItems)}
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
          )}

          {!meLoading && me && (
            <div className={styles.dropdownMenuItem}>
              <button type="button" className={styles.dropdownMenuButton} onClick={handleLogout}>
                <span className={styles.dropdownMenuOptions}>Log out</span>
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
          <p className={styles.copyright}>
            © <CopyrightYear /> Zac Edens
          </p>
        </div>
      </div>
      {contactModal}
    </>
  );
}
