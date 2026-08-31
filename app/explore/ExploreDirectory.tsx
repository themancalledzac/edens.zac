import { NavLink } from '@/app/components/ui/NavLink/NavLink';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { getMetadata } from '@/app/lib/api/collections';

import styles from './Explore.module.scss';

/**
 * The tag and location directory, split out of the route so the page heading can flush before
 * `getMetadata()` resolves. The page owns the header; everything below it lives here.
 *
 * A failed read renders the unreachable-directory message rather than an empty state — see
 * `.empty` in Explore.module.scss for why the two are kept apart. Slugless locations are dropped
 * because they cannot form a valid `/location/[slug]` link.
 */
export async function ExploreDirectory() {
  let data;
  try {
    data = await getMetadata();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <p className={styles.empty}>
        Unable to load the directory right now. Please try again later.
      </p>
    );
  }

  const { tags } = data;
  const locations = data.locations.filter(loc => Boolean(loc.slug));

  if (tags.length === 0 && locations.length === 0) {
    return <EmptyState align="page">Nothing to explore yet — check back soon.</EmptyState>;
  }

  return (
    <div className={styles.sections}>
      <section className={styles.section} aria-labelledby="explore-locations">
        <h2 id="explore-locations" className={styles.sectionHeading}>
          Locations
        </h2>
        {locations.length === 0 ? (
          <EmptyState>No locations yet.</EmptyState>
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
          <EmptyState>No tags yet.</EmptyState>
        ) : (
          <ul className={styles.linkList}>
            {tags.map(tag => (
              <li key={tag.id}>
                <NavLink href={`/tag/${tag.slug}`} className={styles.directoryLink}>
                  {tag.name}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ExploreDirectory;
