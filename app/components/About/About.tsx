import Image from 'next/image';

import styles from './About.module.scss';

interface AboutProps {
  onBack: () => void;
}

/**
 * About Component
 *
 * Personal introduction displaying profile image and bio text.
 *
 * @param props.onBack - Callback to return to previous view (currently unused)
 */
export function About({ onBack: _onBack }: AboutProps) {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.imageContainer}>
          <Image
            src="/_DSC0145.jpg"
            alt="Zechariah Edens - Portrait"
            width={1000}
            height={500}
            className={styles.profileImage}
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
