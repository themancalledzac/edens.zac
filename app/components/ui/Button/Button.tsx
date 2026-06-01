import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';

import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

/**
 * Canonical action button. Replaces the ~30 per-feature *Button classes.
 * Variant drives color; size drives padding/height; loading shows a spinner
 * and disables the control. Forwards all native button attributes.
 *
 * Server-Component-friendly: no hooks, so no 'use client' needed.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const spinnerColor = variant === 'primary' || variant === 'danger' ? 'white' : 'dark';
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoadingSpinner size="small" color={spinnerColor} /> : leftIcon}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
