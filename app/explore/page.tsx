import { type Metadata } from 'next';

import { NavLink } from '@/app/components/ui/NavLink/NavLink';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getMetadata } from '@/app/lib/api/collections';

import styles from './Explore.module.scss';

// Render on every request — getMetadata() calls fetchAdminGetApi, which can fail
// mid-build before the proxy is live. Same rationale as the taxonomy routes.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Explore — Zac Edens Photography',
  description: 'Browse the photography archive by tag or location.',
};

export default async function ExplorePage() {
  let data;
  try {
    data = await getMetadata();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <PageShell>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Explore</h1>
        </header>
        <p className={styles.empty}>
          Unable to load the directory right now. Please try again later.
        </p>
      </PageShell>
    );
  }

  const { tags } = data;
  // LocationModel.slug is optional; a slugless location can't form a valid
  // /location/[slug] link, so drop those rather than emit /location/undefined.
  const locations = data.locations.filter(loc => Boolean(loc.slug));
  const isEmpty = tags.length === 0 && locations.length === 0;

  return (
    <PageShell>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Explore</h1>
        <p className={styles.intro}>Browse the archive by tag or location.</p>
      </header>

      {isEmpty ? (
        <p className={styles.empty}>Nothing to explore yet — check back soon.</p>
      ) : (
        <div className={styles.sections}>
          <section className={styles.section} aria-labelledby="explore-locations">
            <h2 id="explore-locations" className={styles.sectionHeading}>
              Locations
            </h2>
            {locations.length === 0 ? (
              <p className={styles.sectionEmpty}>No locations yet.</p>
            ) : (
              <ul className={styles.linkList}>
                {locations.map(loc => (
                  <li key={loc.id}>
                    <NavLink href={`/location/${loc.slug}`} className={styles.directoryLink}>
                      {loc.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section} aria-labelledby="explore-tags">
            <h2 id="explore-tags" className={styles.sectionHeading}>
              Tags
            </h2>
            {tags.length === 0 ? (
              <p className={styles.sectionEmpty}>No tags yet.</p>
            ) : (
              <ul className={styles.linkList}>
                {tags.map(tag => (
                  <li key={tag.id}>
                    <NavLink href={`/${tag.slug}`} className={styles.directoryLink}>
                      {tag.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
