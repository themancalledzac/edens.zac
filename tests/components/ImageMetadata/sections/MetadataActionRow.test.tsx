import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MetadataActionRow from '@/app/components/ImageMetadata/sections/MetadataActionRow';

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

  // ── Variant classes ──────────────────────────────────────────────────────────

  it('Delete button uses the danger variant', () => {
    render(<MetadataActionRow {...makeProps()} />);
    const btn = screen.getByRole('button', { name: /delete image/i });
    expect(btn.className).toContain('danger');
  });

  it('Cancel button uses the ghost variant', () => {
    render(<MetadataActionRow {...makeProps()} />);
    const btn = screen.getByRole('button', { name: /cancel/i });
    expect(btn.className).toContain('ghost');
  });

  it('Save button uses the primary variant', () => {
    render(<MetadataActionRow {...makeProps({ hasChanges: true })} />);
    const btn = screen.getByRole('button', { name: /save changes/i });
    expect(btn.className).toContain('primary');
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

  it('Remove button uses the danger variant', () => {
    render(<MetadataActionRow {...makeProps({ showRemove: true })} />);
    const btn = screen.getByRole('button', { name: /remove image/i });
    expect(btn.className).toContain('danger');
  });

  // ── saving=true propagates aria-busy (loading buttons) + disabled (cancel) ──

  it('Delete, Save buttons have aria-busy="true" when saving=true (no showRemove)', () => {
    render(<MetadataActionRow {...makeProps({ saving: true, hasChanges: true })} />);
    // Delete and Save use loading={saving} → aria-busy
    expect(screen.getByRole('button', { name: /delete image/i })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.getByRole('button', { name: /save changes/i })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    // Cancel uses disabled={saving} — disabled but no aria-busy
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).not.toHaveAttribute('aria-busy');
  });

  it('Delete, Remove, Save buttons have aria-busy="true" when saving=true and showRemove=true', () => {
    render(
      <MetadataActionRow {...makeProps({ saving: true, hasChanges: true, showRemove: true })} />
    );
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
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  // ── Save disabled when !hasChanges ───────────────────────────────────────────

  it('Save button is disabled when hasChanges=false', () => {
    render(<MetadataActionRow {...makeProps({ hasChanges: false })} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('Save button is NOT disabled when hasChanges=true', () => {
    render(<MetadataActionRow {...makeProps({ hasChanges: true })} />);
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  // ── Bulk-edit labels ─────────────────────────────────────────────────────────

  it('Delete label says "Delete Image" for single (isBulkEdit=false)', () => {
    render(<MetadataActionRow {...makeProps()} />);
    expect(screen.getByRole('button', { name: /delete image$/i })).toBeInTheDocument();
  });

  it('Delete label says "Delete 3 Images" for bulk (isBulkEdit=true, selectedCount=3)', () => {
    render(<MetadataActionRow {...makeProps({ isBulkEdit: true, selectedCount: 3 })} />);
    expect(screen.getByRole('button', { name: /delete 3 images/i })).toBeInTheDocument();
  });

  it('Remove label says "Remove Image" for single', () => {
    render(<MetadataActionRow {...makeProps({ showRemove: true })} />);
    expect(screen.getByRole('button', { name: /remove image$/i })).toBeInTheDocument();
  });

  it('Remove label says "Remove 3 Images" for bulk', () => {
    render(
      <MetadataActionRow {...makeProps({ showRemove: true, isBulkEdit: true, selectedCount: 3 })} />
    );
    expect(screen.getByRole('button', { name: /remove 3 images/i })).toBeInTheDocument();
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
