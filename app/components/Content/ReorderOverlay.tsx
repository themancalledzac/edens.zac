'use client';

import { IconButton } from '@/app/components/ui/IconButton/IconButton';

import styles from './ReorderOverlay.module.scss';

interface ReorderOverlayProps {
  isPickedUp: boolean;
  pickedUpImageId?: number | null;
  hasMoved: boolean;
  isFirst: boolean;
  isLast: boolean;
  onArrowLeft: () => void;
  onArrowRight: () => void;
  onPickUp: () => void;
  onPlace: () => void;
  onCancel: () => void;
}

export default function ReorderOverlay({
  isPickedUp,
  pickedUpImageId,
  hasMoved,
  isFirst,
  isLast,
  onArrowLeft,
  onArrowRight,
  onPickUp,
  onPlace,
  onCancel,
}: ReorderOverlayProps) {
  return (
    <div
      className={`${styles.overlay} ${isPickedUp ? styles.pickedUp : ''} ${hasMoved && !isPickedUp ? styles.moved : ''}`}
    >
      <div className={styles.topRow}>
        <IconButton
          size="sm"
          className={styles.pickUpButton}
          aria-label={isPickedUp ? 'Cancel pick up' : 'Pick up to place elsewhere'}
          onClick={e => {
            e.stopPropagation();
            onPickUp();
          }}
          title={isPickedUp ? 'Cancel pick up' : 'Pick up to place elsewhere'}
        >
          <span aria-hidden="true">{isPickedUp ? '...' : '\u21C4'}</span>
        </IconButton>
        {hasMoved && (
          <IconButton
            size="sm"
            className={styles.cancelButton}
            aria-label="Cancel this image's moves"
            onClick={e => {
              e.stopPropagation();
              onCancel();
            }}
            title="Cancel this image's moves"
          >
            <span aria-hidden="true">{'\u2715'}</span>
          </IconButton>
        )}
      </div>

      <button
        type="button"
        className={styles.arrowLeft}
        onClick={e => {
          e.stopPropagation();
          onArrowLeft();
        }}
        disabled={isFirst}
        aria-label="Move left"
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        className={styles.arrowRight}
        onClick={e => {
          e.stopPropagation();
          onArrowRight();
        }}
        disabled={isLast}
        aria-label="Move right"
      >
        <span aria-hidden="true">→</span>
      </button>

      {!isPickedUp && pickedUpImageId != null && (
        <button
          type="button"
          className={styles.placeTarget}
          onClick={e => {
            e.stopPropagation();
            onPlace();
          }}
          title="Place picked image here"
        />
      )}
    </div>
  );
}
