import { X } from 'lucide-react';

import { IconButton, type IconButtonProps } from '@/app/components/ui/IconButton/IconButton';

export interface CloseButtonProps extends Omit<IconButtonProps, 'children' | 'aria-label'> {
  /** Accessible name; defaults to "Close". */
  'aria-label'?: string;
}

/**
 * Close (✕) button — an IconButton specialized to a single dismiss glyph with a
 * sensible default aria-label. Replaces the 4 byte-divergent close buttons
 * (fullscreen, ImageMetadataModal, TextBlockCreateModal, MenuDropdown).
 */
export function CloseButton({ 'aria-label': ariaLabel = 'Close', ...rest }: CloseButtonProps) {
  return (
    <IconButton aria-label={ariaLabel} {...rest}>
      <X aria-hidden="true" />
    </IconButton>
  );
}
