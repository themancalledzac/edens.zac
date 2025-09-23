'use client';

import Image from 'next/image';

import styles from './About.module.scss';

interface AboutProps {
  onBack: () => void;
}

export function About({ onBack: _onBack }: AboutProps) {
  return (
    <div className={styles.aboutContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.imageContainer}>
          <Image
            src="/profile-portrait.jpg"
            alt="Zechariah Edens - Portrait"
            width={300}
            height={400}
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
