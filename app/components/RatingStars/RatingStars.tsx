'use client';

import { useEffect, useState } from 'react';

import styles from './RatingStars.module.scss';

interface RatingStarsProps {
  initialRating: number | null;
  onChange: (rating: number | null) => Promise<void> | void;
  ariaLabel?: string;
}

export default function RatingStars({ initialRating, onChange, ariaLabel }: RatingStarsProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [pending, setPending] = useState(false);

  // `initialRating` often arrives after mount (admin metadata fetch), so the mount-time seed
  // would otherwise show empty stars for an already-rated collection all session.
  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleClick = async (next: number) => {
    const newRating = rating === next ? null : next;
    setPending(true);
    try {
      await onChange(newRating);
      setRating(newRating);
    } catch {
      // Swallowed deliberately: `onChange` surfaces the failure to the user before
      // rethrowing, and the click handler discards this promise. Stars keep the old value.
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
