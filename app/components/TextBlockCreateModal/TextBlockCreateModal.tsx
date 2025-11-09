'use client';

import { type FormEvent, useState } from 'react';

import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';

import styles from './TextBlockCreateModal.module.scss';

interface TextBlockCreateModalProps {
  scrollPosition: number;
  onClose: () => void;
  onSubmit: (data: { content: string; format: 'plain' | 'markdown' | 'html'; align: 'left' | 'center' | 'right' }) => Promise<void>;
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
export default function TextBlockCreateModal({
  scrollPosition,
  onClose,
  onSubmit,
}: TextBlockCreateModalProps) {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'plain' | 'markdown' | 'html'>('plain');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate content
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
    <div
      className={styles.modalWrapper}
      style={{ top: `${scrollPosition}px` }}
      onClick={e => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.heading}>Create New Text Block</h2>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            ×
          </button>
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
                onChange={e => setFormat(e.target.value as 'plain' | 'markdown' | 'html')}
                className={styles.formSelect}
              >
                <option value="plain">Plain Text</option>
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Alignment</label>
              <select
                value={align}
                onChange={e => setAlign(e.target.value as 'left' | 'center' | 'right')}
                className={styles.formSelect}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
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
                  <span style={{ marginLeft: '8px' }}>Creating...</span>
                </>
              ) : (
                'Create Text Block'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

