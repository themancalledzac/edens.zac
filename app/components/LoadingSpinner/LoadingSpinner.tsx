import styles from './LoadingSpinner.module.scss';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'dark' | 'grey';
}

/**
 * Loading Spinner Component
 *
 * Animated spinner for loading states with configurable size and color.
 * Uses CSS animations for smooth rotation effect.
 *
 * @param size - Spinner size: small (16px), medium (24px), large (32px)
 * @param color - Color variant: white, dark, or grey
 */
export function LoadingSpinner({ size = 'medium', color = 'white' }: LoadingSpinnerProps) {
  return (
    <div className={`${styles.spinner} ${styles[size]} ${styles[color]}`}>
      <div className={styles.circle} />
    </div>
  );
}