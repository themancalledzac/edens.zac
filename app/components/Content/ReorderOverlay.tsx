'use client';

import styles from './ReorderOverlay.module.scss';

interface ReorderOverlayProps {
  contentId: number;
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
      {/* Top row: pick-up (left) and cancel (right) */}
      <div className={styles.topRow}>
        <button
          type="button"
          className={styles.pickUpButton}
          onClick={e => {
            e.stopPropagation();
            onPickUp();
          }}
          title={isPickedUp ? 'Cancel pick up' : 'Pick up to place elsewhere'}
        >
          {isPickedUp ? '...' : '\u21C4'}
        </button>
        {hasMoved && (
          <button
            type="button"
            className={styles.cancelButton}
            onClick={e => {
              e.stopPropagation();
              onCancel();
            }}
            title="Cancel this image's moves"
          >
            {'\u2715'}
          </button>
        )}
      </div>

      {/* Arrow buttons on left and right sides */}
      <button
        type="button"
        className={styles.arrowLeft}
        onClick={e => {
          e.stopPropagation();
          onArrowLeft();
        }}
        disabled={isFirst}
        title="Move left"
      >
        ←
      </button>
      <button
        type="button"
        className={styles.arrowRight}
        onClick={e => {
          e.stopPropagation();
          onArrowRight();
        }}
        disabled={isLast}
        title="Move right"
      >
        →
      </button>

      {/* Place target overlay — shown when another image is picked up */}
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
