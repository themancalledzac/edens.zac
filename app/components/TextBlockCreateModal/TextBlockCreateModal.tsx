'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Select } from '@/app/components/ui/Field/Select';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import { Modal } from '@/app/components/ui/Modal/Modal';
import {
  TEXT_ALIGN_OPTIONS,
  TEXT_FORMAT_OPTIONS,
  type TextAlign,
  type TextFormat,
} from '@/app/types/Content';

import styles from './TextBlockCreateModal.module.scss';

interface TextBlockCreateModalProps {
  onClose: () => void;
  onSubmit: (data: { content: string; format: TextFormat; align: TextAlign }) => Promise<void>;
}

/**
 * Modal for creating a new text block.
 *
 * Renders inside {@link Modal} which propagates the admin dark surface through
 * its portal, so all ui/ primitives adapt via token cascade with no hardcoded colors.
 */
export default function TextBlockCreateModal({ onClose, onSubmit }: TextBlockCreateModalProps) {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<TextFormat>('plain');
  const [align, setAlign] = useState<TextAlign>('left');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('Text content is required');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({ content: content.trim(), format, align });
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to create text block');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setError(null);
    onClose();
  };

  return (
    <Modal open onClose={handleCancel} variant="overlay" labelledBy="text-block-modal-title">
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 id="text-block-modal-title" className={styles.heading}>
            Create New Text Block
          </h2>
          <CloseButton onClick={handleCancel} aria-label="Close modal" />
        </div>

        <FormError>{error}</FormError>

        <form onSubmit={handleSubmit}>
          <Field label="Text Content *" htmlFor="text-block-content" className={styles.formGroup}>
            <Textarea
              id="text-block-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Enter text content for the new block..."
              rows={8}
              required
              autoFocus
            />
          </Field>

          <div className={styles.formRow}>
            <Field label="Format" htmlFor="text-block-format" className={styles.formGroup}>
              <Select
                id="text-block-format"
                value={format}
                onChange={e => setFormat(e.target.value as TextFormat)}
              >
                {TEXT_FORMAT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Alignment" htmlFor="text-block-align" className={styles.formGroup}>
              <Select
                id="text-block-align"
                value={align}
                onChange={e => setAlign(e.target.value as TextAlign)}
              >
                {TEXT_ALIGN_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className={styles.formActions}>
            <Button variant="ghost" type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={saving}
              disabled={saving || !content.trim()}
            >
              Create Text Block
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
