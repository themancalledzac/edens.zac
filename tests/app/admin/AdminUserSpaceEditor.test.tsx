/**
 * Tests for AdminUserSpaceEditor — the admin editing layer mounted around a user's own space.
 *
 * It renders no fields itself: it publishes them through the same InlineEditContext the collection
 * manage mode uses, and the space's header rail draws them. So this suite drives a stand-in for
 * that rail — the same four things CollectionContentRenderer reads — and asserts what reaches it.
 *
 * The load-bearing cases: each field commits alone and sends the rest of the record unchanged; a
 * failed write rolls back (read and edit render identically, so a stale field would look saved);
 * and the collection-only slots stay ABSENT, or the rail would offer to add a location to a person.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AdminUserSpaceEditor } from '@/app/(admin)/admin/users/[id]/AdminUserSpaceEditor';
import { useInlineEdit } from '@/app/components/ContentCollection/edit/InlineEditContext';
import { InlineEditableText } from '@/app/components/ui/InlineEditableText/InlineEditableText';
import { ApiError } from '@/app/lib/api/core';
import * as usersApi from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock('@/app/lib/api/users', () => ({
  updateUser: jest.fn(),
  // GenerateInviteButton rides in the title aside; it only calls this on click.
  regenerateInvite: jest.fn(),
}));

const mockUpdateUser = usersApi.updateUser as jest.MockedFunction<typeof usersApi.updateUser>;

const user: AdminUserSummary = {
  id: 5,
  email: 'cara@x.com',
  displayName: 'Cara',
  status: 'ACTIVE',
  description: 'Wedding client, 2026',
};

const payload = (patch: Partial<AdminUserSummary> = {}) => ({
  email: 'cara@x.com',
  displayName: 'Cara',
  status: 'ACTIVE' as const,
  description: 'Wedding client, 2026',
  ...patch,
});

/**
 * Stand-in for the header rail: consumes the context exactly as CollectionContentRenderer's TEXT
 * branch does, including the two surface-specific slots.
 */
function RailProbe() {
  const inlineEdit = useInlineEdit();
  if (!inlineEdit) return <p>no inline edit context</p>;
  return (
    <div>
      {inlineEdit.titleLead ?? (
        <InlineEditableText
          as="input"
          value={inlineEdit.title ?? ''}
          onCommit={value => inlineEdit.onCommitField('title', value)}
          ariaLabel={inlineEdit.titleLabel ?? 'Collection title'}
        />
      )}
      {/* The rail draws no title field on this surface, so a stray 'title' commit must be a no-op
          rather than writing something. */}
      <button type="button" onClick={() => inlineEdit.onCommitField('title', 'Renamed')}>
        commit title
      </button>
      {inlineEdit.titleAside}
      {inlineEdit.beforeDescription}
      <InlineEditableText
        as="textarea"
        value={inlineEdit.description}
        onCommit={value => inlineEdit.onCommitField('description', value)}
        ariaLabel={inlineEdit.descriptionLabel ?? 'Collection description'}
      />
      <span data-testid="has-location">{String(Boolean(inlineEdit.onEditLocation))}</span>
      <span data-testid="has-cover-pick">{String(Boolean(inlineEdit.onTogglePickCover))}</span>
      <span data-testid="editor-class">{String(Boolean(inlineEdit.textEditorClassName))}</span>
      <span data-testid="has-title-lead">{String(Boolean(inlineEdit.titleLead))}</span>
    </div>
  );
}

function renderEditor(overrides: Partial<AdminUserSummary> = {}) {
  return render(
    <AdminUserSpaceEditor user={{ ...user, ...overrides }}>
      <RailProbe />
    </AdminUserSpaceEditor>
  );
}

/** Click the read state of an inline field and return the control it becomes. */
function openField(name: string): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.getByRole('textbox', { name });
}

describe('AdminUserSpaceEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.mockResolvedValue(user);
  });

  it("publishes the user's fields to the rail under user-appropriate names", () => {
    renderEditor();

    expect(screen.getByRole('button', { name: 'Description' })).toHaveTextContent(
      'Wedding client, 2026'
    );
    expect(screen.getByRole('button', { name: 'Email' })).toHaveTextContent('cara@x.com');
    expect(screen.getByLabelText('Status')).toHaveValue('ACTIVE');
  });

  // The space's cover already carries this person's name as its overlay, so the rail leads with
  // the email instead — in the corner the name used to hold, not buried further down the block.
  it('leads the rail with the email in place of the name', () => {
    renderEditor();

    expect(screen.getByTestId('has-title-lead')).toHaveTextContent('true');
    expect(screen.queryByRole('button', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email' })).toHaveTextContent('cara@x.com');
  });

  // A person has no locations and no collection cover. Leaving these set would put an "Add
  // location" button and a cover picker in a rail that has nothing to point them at.
  it('leaves the collection-only slots unset', () => {
    renderEditor();

    expect(screen.getByTestId('has-location')).toHaveTextContent('false');
    expect(screen.getByTestId('has-cover-pick')).toHaveTextContent('false');
  });

  it('supplies the seamless editor class so entering edit redraws nothing', () => {
    renderEditor();

    expect(screen.getByTestId('editor-class')).toHaveTextContent('true');
  });

  // Status and the invite/reset action are both about the ACCOUNT, so they share the rail's
  // top-right corner rather than being split between the title row and the rail's foot.
  it('pins the invite/reset action beside status in the title aside', () => {
    renderEditor();

    const aside = screen.getByLabelText('Status').parentElement;
    expect(aside).not.toBeNull();
    expect(aside).toContainElement(screen.getByRole('button', { name: 'Reset pw' }));
  });

  // The label switches on account status, so it has to track a change made in the select beside it.
  it('relabels the invite action when the status changes under it', async () => {
    renderEditor({ status: 'INVITED' });

    expect(screen.getByRole('button', { name: 'Resend' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ACTIVE' } });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reset pw' })).toBeInTheDocument()
    );
  });

  // The display name is not editable on this surface at all — renaming happens in the /admin Users
  // panel. A 'title' commit must therefore write nothing rather than quietly renaming the user.
  it('ignores a title commit rather than writing a display name', async () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'commit title' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument());
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('commits the description on Enter', async () => {
    renderEditor();

    const input = openField('Description');
    fireEvent.change(input, { target: { value: 'Eloped, 2027' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith(5, payload({ description: 'Eloped, 2027' }))
    );
  });

  it('commits the email on Enter', async () => {
    renderEditor();

    const input = openField('Email');
    fireEvent.change(input, { target: { value: 'cara@y.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith(5, payload({ email: 'cara@y.com' }))
    );
  });

  it('commits a status change straight from the select', async () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'DISABLED' } });

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith(5, payload({ status: 'DISABLED' }))
    );
  });

  it('reverts on Escape without writing', async () => {
    renderEditor();

    const input = openField('Description');
    fireEvent.change(input, { target: { value: 'Wrong' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Description' })).toHaveTextContent(
        'Wedding client, 2026'
      )
    );
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('does not write when a field is committed unchanged', async () => {
    renderEditor();

    const input = openField('Description');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Description' })).toHaveTextContent(
        'Wedding client, 2026'
      )
    );
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('rolls the field back and says so when the save fails', async () => {
    mockUpdateUser.mockRejectedValue(new ApiError('Conflict', 409));

    renderEditor();

    const input = openField('Email');
    fireEvent.change(input, { target: { value: 'taken@x.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/already exists.*rolled back/i)
    );
    expect(screen.getByRole('button', { name: 'Email' })).toHaveTextContent('cara@x.com');
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('refuses a blank email without attempting the write', async () => {
    renderEditor();

    const input = openField('Email');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i));
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('clears a whitespace-only description to null rather than an empty string', async () => {
    renderEditor();

    const input = openField('Description');
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith(5, payload({ description: null }))
    );
  });

  it('offers a single Close cell that leaves for the admin hub, and no edit mode to enter', () => {
    renderEditor();

    expect(screen.getByRole('toolbar', { name: 'User actions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockPush).toHaveBeenCalledWith('/admin');
  });
});
