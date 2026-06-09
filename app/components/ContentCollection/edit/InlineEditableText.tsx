'use client';

import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';

import { Input } from '@/app/components/ui/Field/Input';
import { Textarea } from '@/app/components/ui/Field/Textarea';

import styles from './InlineEditableText.module.scss';

export interface InlineEditableTextProps {
  /** Committed value shown when not editing and seeded into the control on focus. */
  value: string;
  /** Control rendered while editing. */
  as: 'input' | 'textarea';
  /** Called with the trimmed-of-nothing buffer on blur or Enter when the value changed. */
  onCommit: (value: string) => void;
  /** Class applied to the read-only element so it matches the surrounding text. */
  readOnlyClassName?: string;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Read-only text that turns into an Input or Textarea on click/focus. Commits via onCommit on
 * blur and Enter (Shift+Enter inserts a newline in textarea); Escape reverts and exits.
 */
export function InlineEditableText({
  value,
  as,
  onCommit,
  readOnlyClassName,
  placeholder,
  ariaLabel,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const beginEditing = () => {
    committedRef.current = false;
    setDraft(value);
    setIsEditing(true);
  };

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setIsEditing(false);
    if (draft !== value) onCommit(draft);
  };

  const cancel = () => {
    committedRef.current = true;
    setDraft(value);
    setIsEditing(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === 'Enter' && (as === 'input' || !event.shiftKey)) {
      event.preventDefault();
      commit();
    }
  };

  if (!isEditing) {
    const display = value.length > 0 ? value : (placeholder ?? '');
    return (
      <span
        role="button"
        tabIndex={0}
        className={[styles.readOnly, readOnlyClassName].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
        onClick={beginEditing}
        onFocus={beginEditing}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            beginEditing();
          }
        }}
      >
        {display}
      </span>
    );
  }

  const sharedProps = {
    autoFocus: true,
    value: draft,
    placeholder,
    'aria-label': ariaLabel,
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onBlur: commit,
    onKeyDown: handleKeyDown,
  };

  return as === 'textarea' ? (
    <Textarea {...sharedProps} className={styles.editor} />
  ) : (
    <Input {...sharedProps} className={styles.editor} />
  );
}

export default InlineEditableText;
