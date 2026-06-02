import { type ReactNode } from 'react';

import styles from './Field.module.scss';

export interface FieldProps {
  label: string;
  /** id of the control this label points at. */
  htmlFor: string;
  /** Optional helper/hint text below the label. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Labeled form field wrapper. Owns the <label htmlFor> ↔ control association. */
export function Field({ label, htmlFor, hint, children, className }: FieldProps) {
  const classes = [styles.field, className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {hint && <span className={styles.hint}>{hint}</span>}
      {children}
    </div>
  );
}

export default Field;
