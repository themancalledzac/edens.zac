import { type ReactNode } from 'react';

import styles from './Field.module.scss';

export interface FormErrorProps {
  children: ReactNode;
}

/** Inline form error. Announces via role="alert"; renders nothing when empty. */
export function FormError({ children }: FormErrorProps) {
  if (!children) {
    return null;
  }
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  );
}

export default FormError;
