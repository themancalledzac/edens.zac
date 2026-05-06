import Image from 'next/image';
import Link from 'next/link';

import styles from './AdminHubGrid.module.scss';
import type { AdminTileMerged } from './adminTiles';

interface AdminTileProps {
  tile: AdminTileMerged;
}

function AdminTile({ tile }: AdminTileProps) {
  return (
    <div className={styles.tileWrapper}>
      <Link href={tile.href} className={styles.tile}>
        <div className={styles.imageWrapper}>
          {tile.coverImageUrl ? (
            <Image
              src={tile.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 90vw"
              className={styles.tileImage}
            />
          ) : (
            <div className={styles.placeholder} />
          )}
        </div>
        <div className={styles.overlay}>
          <span className={styles.title}>{tile.label}</span>
        </div>
      </Link>
    </div>
  );
}

interface AdminHubGridProps {
  tiles: AdminTileMerged[];
}

export default function AdminHubGrid({ tiles }: AdminHubGridProps) {
  return (
    <div className={styles.grid}>
      {tiles.map(tile => (
        <AdminTile key={tile.tileKey} tile={tile} />
      ))}
    </div>
  );
}
