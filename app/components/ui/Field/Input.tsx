import { type InputHTMLAttributes } from 'react';

import styles from './Field.module.scss';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = 'text', ...rest }: InputProps) {
  const classes = [styles.control, styles.input, className].filter(Boolean).join(' ');
  return <input type={type} className={classes} {...rest} />;
}

export default Input;
