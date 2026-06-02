import { type SelectHTMLAttributes } from 'react';

import styles from './Field.module.scss';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...rest }: SelectProps) {
  const classes = [styles.control, styles.select, className].filter(Boolean).join(' ');
  return (
    <select className={classes} {...rest}>
      {children}
    </select>
  );
}

export default Select;
