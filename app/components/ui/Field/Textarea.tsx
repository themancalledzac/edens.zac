import { type TextareaHTMLAttributes } from 'react';

import styles from './Field.module.scss';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...rest }: TextareaProps) {
  const classes = [styles.control, styles.textarea, className].filter(Boolean).join(' ');
  return <textarea className={classes} {...rest} />;
}

export default Textarea;
