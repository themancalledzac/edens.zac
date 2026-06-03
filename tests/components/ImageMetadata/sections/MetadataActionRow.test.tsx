import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MetadataActionRow from '@/app/components/ImageMetadata/sections/MetadataActionRow';

// Note on what is intentionally NOT asserted here:
// The Button variant→class mapping (danger/ghost/warning) is the primitive's contract and is
// covered in tests/components/ui/Button.test.tsx — re-asserting it here would just couple this
// suite to CSS-module internals. The on-dark visibility overrides (saveOnDark/cancelOnDark) are a
// *visual* concern: jsdom has no layout/computed style, so a class-string check gives false
// confidence (the real dark-surface regression was caught by browser getComputedStyle, not a unit
// test). This suite asserts behavior the consumer can observe: which buttons render, their
// accessible labels/state, and that clicks fire the right callbacks.

function makeProps(overrides: Partial<Parameters<typeof MetadataActionRow>[0]> = {}) {
  return {
    isBulkEdit: false,
    selectedCount: 1,
    saving: false,
    hasChanges: false,
    showRemove: false,
    onDelete: jest.fn(),
    onRemove: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

describe('MetadataActionRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  it('renders Delete, Cancel, and Save buttons', () => {
    render(<MetadataActionRow {...makeProps()} />);
    expect(screen.getByRole('button', { name: /delete image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  // ── Remove button visibility ─────────────────────────────────────────────────

  it('Remove button is NOT rendered when showRemove=false', () => {
    render(<MetadataActionRow {...makeProps({ showRemove: false })} />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('Remove button IS rendered when showRemove=true', () => {
    render(<MetadataActionRow {...makeProps({ showRemove: true })} />);
    expect(screen.getByRole('button', { name: /remove image/i })).toBeInTheDocument();
  });

  // ── saving=true → aria-busy on loading buttons, disabled (no busy) on Cancel ──

  it('marks Delete/Remove/Save aria-busy and disables Cancel while saving', () => {
    render(
      <MetadataActionRow {...makeProps({ saving: true, hasChanges: true, showRemove: true })} />
    );
    // Delete, Remove, and Save use loading={saving} → aria-busy="true".
    expect(screen.getByRole('button', { name: /delete image/i })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.getByRole('button', { name: /remove image/i })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.getByRole('button', { name: /save changes/i })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    // Cancel uses disabled={saving} — disabled, but never marked busy.
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).not.toHaveAttribute('aria-busy');
  });

  // ── Save disabled gating on hasChanges ───────────────────────────────────────

  it('Save button is disabled when hasChanges=false', () => {
    render(<MetadataActionRow {...makeProps({ hasChanges: false })} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('Save button is NOT disabled when hasChanges=true', () => {
    render(<MetadataActionRow {...makeProps({ hasChanges: true })} />);
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  // ── Count label (single vs bulk) ─────────────────────────────────────────────

  it('Delete label says "Delete Image" for single (isBulkEdit=false)', () => {
    render(<MetadataActionRow {...makeProps()} />);
    expect(screen.getByRole('button', { name: /delete image$/i })).toBeInTheDocument();
  });

  it('pluralizes the count label for bulk edits ("Delete 3 Images")', () => {
    render(<MetadataActionRow {...makeProps({ isBulkEdit: true, selectedCount: 3 })} />);
    expect(screen.getByRole('button', { name: /delete 3 images/i })).toBeInTheDocument();
  });

  // ── Click handlers ───────────────────────────────────────────────────────────

  it('calls onDelete when Delete is clicked', async () => {
    const onDelete = jest.fn();
    render(<MetadataActionRow {...makeProps({ onDelete })} />);
    await userEvent.click(screen.getByRole('button', { name: /delete image/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove when Remove is clicked', async () => {
    const onRemove = jest.fn();
    render(<MetadataActionRow {...makeProps({ showRemove: true, onRemove })} />);
    await userEvent.click(screen.getByRole('button', { name: /remove image/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = jest.fn();
    render(<MetadataActionRow {...makeProps({ onCancel })} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
