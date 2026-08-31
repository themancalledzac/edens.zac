import Image from 'next/image';

import { IMAGE } from '@/app/constants';

import styles from './About.module.scss';

/**
 * About Component
 *
 * Personal introduction displaying profile image and bio text.
 */
export function About() {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.imageContainer}>
          <Image
            src="/_DSC0145.jpg"
            alt="Zechariah Edens - Portrait"
            width={1000}
            height={750}
            className={styles.profileImage}
            quality={IMAGE.quality}
          />
        </div>
        <div className={styles.textContainer}>
          <p>
            Photographer and Software engineer. This site is a little portfolio page for both of my
            passions. Shoot me a message if you'd like to know more, see an Image you'd like to have
            printed, or maybe even collab.
          </p>
        </div>
      </div>
    </div>
  );
}
