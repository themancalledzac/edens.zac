'use client';

import { useState } from 'react';

import styles from './RatingStars.module.scss';

interface RatingStarsProps {
  initialRating: number | null;
  onChange: (rating: number | null) => Promise<void> | void;
  ariaLabel?: string;
}

export default function RatingStars({ initialRating, onChange, ariaLabel }: RatingStarsProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [pending, setPending] = useState(false);

  const handleClick = async (next: number) => {
    const newRating = rating === next ? null : next;
    setPending(true);
    try {
      await onChange(newRating);
      setRating(newRating);
    } finally {
      setPending(false);
    }
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel ?? 'Rating'} className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={rating === n}
          disabled={pending}
          className={`${styles.star} ${rating != null && n <= rating ? styles.filled : ''}`}
          onClick={() => handleClick(n)}
        >
          <span aria-hidden="true">{rating != null && n <= rating ? '*' : '.'}</span>
          <span className={styles.srOnly}>{n} stars</span>
        </button>
      ))}
    </div>
  );
}
