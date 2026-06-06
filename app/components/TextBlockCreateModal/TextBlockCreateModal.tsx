'use client';

import { type SubmitEvent, useState } from 'react';

import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
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
 * Modal for creating a new text block
 *
 * Provides a form with:
 * - Textarea for content
 * - Format selector (plain, markdown, html)
 * - Alignment selector (left, center, right)
 * - Save and cancel buttons
 */
export default function TextBlockCreateModal({ onClose, onSubmit }: TextBlockCreateModalProps) {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<TextFormat>('plain');
  const [align, setAlign] = useState<TextAlign>('left');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('Text content is required');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        content: content.trim(),
        format,
        align,
      });
      // Modal will be closed by parent after successful submission
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

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Text Content *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className={styles.formTextarea}
              placeholder="Enter text content for the new block..."
              rows={8}
              required
              autoFocus
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as TextFormat)}
                className={styles.formSelect}
              >
                {TEXT_FORMAT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Alignment</label>
              <select
                value={align}
                onChange={e => setAlign(e.target.value as TextAlign)}
                className={styles.formSelect}
              >
                {TEXT_ALIGN_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={saving || !content.trim()}
            >
              {saving ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  <span className={styles.loadingLabel}>Creating...</span>
                </>
              ) : (
                'Create Text Block'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
