'use client';

import Image from 'next/image';

import styles from './About.module.scss';

interface AboutProps {
  onBack: () => void;
}

export function About({ onBack }: AboutProps) {
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
            I'm a photographer and developer passionate about capturing moments and creating digital experiences.
            My work spans from landscape photography to portrait sessions, always seeking to tell compelling stories
            through visual media. When I'm not behind the camera, I'm building software solutions that help bring
            creative visions to life.
          </p>
        </div>
      </div>
    </div>
  );
}