import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';

import styles from './IconButton.module.scss';

export type IconButtonShape = 'round' | 'square';
export type IconButtonVariant = 'overlay' | 'ghost';
export type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /** Required: an icon-only button has no visible text, so it needs an accessible name. */
  'aria-label': string;
  shape?: IconButtonShape;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  /** The icon to render. */
  children: ReactNode;
}

/**
 * Icon-only button. The `aria-label` prop is required by the type because there
 * is no visible text to name the control.
 *
 * Server-Component-friendly: no hooks, so no 'use client' needed.
 */
export function IconButton({
  shape = 'round',
  variant = 'ghost',
  size = 'md',
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: IconButtonProps) {
  const classes = [styles.iconButton, styles[shape], styles[variant], styles[size], className]
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
      {loading ? <LoadingSpinner size="small" color="dark" /> : children}
    </button>
  );
}
