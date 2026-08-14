import styles from './ShareBanner.module.scss';

export interface ShareBannerProps {
  /** The sharer's display name, or null when they have never set one. */
  ownerName: string | null;
}

/**
 * Standing context for a share recipient: whose work this is, and that they are looking at it
 * read-only.
 *
 * Persistent rather than dismissible on purpose. The recipient arrived by clicking a link in a
 * message, has no account, and will walk off into collections from here — without a standing
 * marker, "whose site am I on and why can I see this?" has no answer anywhere on the page.
 *
 * Falls back to an unnamed phrasing rather than hiding: the fact that this is a shared view is the
 * load-bearing half, and it holds whether or not the owner ever set a display name.
 */
export function ShareBanner({ ownerName }: ShareBannerProps) {
  return (
    <aside className={styles.banner} aria-label="Shared view">
      <p className={styles.text}>
        {ownerName ? (
          <>
            You are viewing <strong className={styles.name}>{ownerName}</strong>&apos;s work,
            shared with you.
          </>
        ) : (
          <>You are viewing work that was shared with you.</>
        )}
      </p>
    </aside>
  );
}
