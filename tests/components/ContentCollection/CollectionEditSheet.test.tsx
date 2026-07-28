import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { CollectionEditSheet } from '@/app/components/ContentCollection/edit/CollectionEditSheet';
import { makeEdit, makeState, makeUpdateData } from '@/tests/fixtures/collectionEditFixtures';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/app/components/CollectionListSelector/CollectionListSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="collection-list-selector" />,
}));

jest.mock('@/app/components/ui/TagsSelector/TagsSelector', () => ({
  __esModule: true,
  default: ({ emptyText }: { emptyText?: string }) => (
    <div data-testid="tags-selector">{emptyText}</div>
  ),
}));

jest.mock('@/app/components/RatingStars/RatingStars', () => ({
  __esModule: true,
  default: ({
    ariaLabel,
    onChange,
  }: {
    ariaLabel?: string;
    onChange: (rating: number | null) => Promise<void> | void;
  }) => (
    <button
      type="button"
      data-testid="rating-stars"
      aria-label={ariaLabel}
      onClick={() => onChange(3)}
    />
  ),
}));

// Self-contained section that fetches on mount — stubbed here; behavior is covered by
// tests/components/CollectionRolesSection.test.tsx.
jest.mock('@/app/components/ContentCollection/edit/sections/CollectionRolesSection', () => ({
  __esModule: true,
  CollectionRolesSection: () => <div data-testid="collection-roles-section" />,
}));

describe('CollectionEditSheet — InfoTab', () => {
  it('renders Title, the two kind checkboxes, and the Visibility dropdown', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Client gallery')).toBeInTheDocument();
    expect(screen.getByLabelText('Blog')).toBeInTheDocument();
    expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
    expect(screen.queryByLabelText('Collection Type')).not.toBeInTheDocument();
  });

  it('reflects the collection kind in the checkboxes', () => {
    render(
      <CollectionEditSheet edit={makeEdit({ editTab: 'info', updateData: makeUpdateData({ isBlog: true }) })} />
    );
    expect(screen.getByLabelText('Client gallery')).not.toBeChecked();
    expect(screen.getByLabelText('Blog')).toBeChecked();
  });

  it('checking Client gallery sets isClient true and clears isBlog', () => {
    const setUpdateField = jest.fn();
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'info',
          updateData: makeUpdateData({ isBlog: true }),
          setUpdateField,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText('Client gallery'));
    expect(setUpdateField).toHaveBeenCalledWith('isClient', true);
    expect(setUpdateField).toHaveBeenCalledWith('isBlog', false);
  });

  it('checking Blog sets isBlog true and clears isClient', () => {
    const setUpdateField = jest.fn();
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'info',
          updateData: makeUpdateData({ isClient: true }),
          setUpdateField,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText('Blog'));
    expect(setUpdateField).toHaveBeenCalledWith('isBlog', true);
    expect(setUpdateField).toHaveBeenCalledWith('isClient', false);
  });

  it('unchecking a kind clears only that flag', () => {
    const setUpdateField = jest.fn();
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'info',
          updateData: makeUpdateData({ isClient: true }),
          setUpdateField,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText('Client gallery'));
    expect(setUpdateField).toHaveBeenCalledWith('isClient', false);
    expect(setUpdateField).not.toHaveBeenCalledWith('isBlog', false);
  });

  it('renders Tags and People (consolidated into Info)', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} />);
    expect(screen.getByTestId('tags-selector')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('shows gallery access group for a standalone client gallery (isClient, no children)', () => {
    // R12: this is the case that vanishes if the gate collapses to `isParent` alone —
    // a delivered gallery with no child collections would lose BOTH set and revoke.
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ isClient: true }),
      updateData: makeUpdateData({ isClient: true }),
      isParent: false,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.getByRole('heading', { name: 'Gallery Access' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient email')).toBeInTheDocument();
  });

  it('shows gallery access group for isParent=true', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ isClient: false }),
      updateData: makeUpdateData({ isClient: false }),
      isParent: true,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.getByRole('heading', { name: 'Gallery Access' })).toBeInTheDocument();
  });

  it('does NOT show gallery access group for a non-client, non-parent collection', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ isClient: false }),
      updateData: makeUpdateData({ isClient: false }),
      isParent: false,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.queryByRole('heading', { name: 'Gallery Access' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('shows the Clear Password button when the gallery already has a password set', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ isClient: true, isPasswordProtected: true }),
      updateData: makeUpdateData({ isClient: true }),
      isParent: false,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.getByRole('button', { name: 'Clear Password' })).toBeInTheDocument();
  });

  it('hides the Clear Password button when the gallery has no password', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ isClient: true, isPasswordProtected: false }),
      updateData: makeUpdateData({ isClient: true }),
      isParent: false,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.queryByRole('button', { name: 'Clear Password' })).not.toBeInTheDocument();
  });

  it('renders the roles access section for a saved collection regardless of type', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} />);
    expect(screen.getByTestId('collection-roles-section')).toBeInTheDocument();
  });

  it('does not render the roles access section when the collection has no id (create flow)', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ id: undefined }),
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.queryByTestId('collection-roles-section')).not.toBeInTheDocument();
  });

  it('renders galleryStatus into the role="status" element', () => {
    const statusText = 'Password saved. No email sent.';
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ isClient: true }),
      updateData: makeUpdateData({ isClient: true }),
      isParent: false,
      galleryStatus: statusText,
    });
    render(<CollectionEditSheet edit={edit} />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveTextContent(statusText);
  });

  it('has no "access" tab rendering path — editTab="access" renders nothing', () => {
    const edit = makeEdit({
      // @ts-expect-error intentionally testing the removed tab
      editTab: 'access',
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tags-selector')).not.toBeInTheDocument();
    expect(screen.queryByText('Collection Type')).not.toBeInTheDocument();
  });
});

describe('CollectionEditSheet — StructureTab', () => {
  it('renders the collection selector; Collection Type moved to Info', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure' })} />);
    expect(screen.queryByLabelText('Collection Type')).not.toBeInTheDocument();
    expect(screen.getByTestId('collection-list-selector')).toBeInTheDocument();
  });

  it('shows Order and Row Density for non-parent collection', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure', isParent: false })} />);
    expect(screen.getByLabelText('Order')).toBeInTheDocument();
    expect(screen.getByLabelText(/Row Density/)).toBeInTheDocument();
  });

  it('shows Order and Row Density for a parent collection too (D4)', () => {
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'structure',
          isParent: true,
        })}
      />
    );
    expect(screen.getByLabelText('Order')).toBeInTheDocument();
    expect(screen.getByLabelText(/Row Density/)).toBeInTheDocument();
  });

  it('shows the cover button on the Info tab', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info', isParent: false })} />);
    expect(screen.getByRole('button', { name: /set cover image/i })).toBeInTheDocument();
  });

  it('does not show the cover button on the Structure tab', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure', isParent: false })} />);
    expect(screen.queryByRole('button', { name: /cover image/i })).not.toBeInTheDocument();
  });
});

describe('CollectionEditSheet — ARIA tabpanel wiring', () => {
  it('info tab: panel has role=tabpanel, id=tabpanel-info, aria-labelledby=tab-info', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('id', 'tabpanel-info');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-info');
  });

  it('structure tab: panel has role=tabpanel, id=tabpanel-structure, aria-labelledby=tab-structure', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure' })} />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('id', 'tabpanel-structure');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-structure');
  });

  it('panel id matches the EditBar tab button id convention (tabpanel-${editTab})', () => {
    // Verify the naming convention is consistent so aria-controls on the EditBar
    // tab button resolves to the panel rendered by this sheet.
    const { rerender } = render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} />);
    expect(document.getElementById('tabpanel-info')).not.toBeNull();
    expect(document.getElementById('tabpanel-structure')).toBeNull();

    rerender(<CollectionEditSheet edit={makeEdit({ editTab: 'structure' })} />);
    expect(document.getElementById('tabpanel-structure')).not.toBeNull();
    expect(document.getElementById('tabpanel-info')).toBeNull();
  });
});

describe('CollectionEditSheet — desktop two-column layout', () => {
  it('renders Info and Structure fields at the same time', () => {
    // editTab is irrelevant in two-column mode — both panels mount regardless.
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} twoColumn />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument(); // Info
    expect(screen.getByLabelText('Order')).toBeInTheDocument(); // Structure
    expect(screen.getByTestId('collection-list-selector')).toBeInTheDocument(); // Structure
  });

  it('exposes the Info and Structure columns as labeled regions and no tabpanel (the chooser is dropped on desktop)', () => {
    render(<CollectionEditSheet edit={makeEdit()} twoColumn />);
    expect(screen.getByRole('region', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Structure' })).toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  });
});

describe('CollectionEditSheet — StructureTab collection rating', () => {
  it('renders the Rating section for a normal collection', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure' })} />);
    expect(screen.getByRole('heading', { name: 'Rating' })).toBeInTheDocument();
    expect(screen.getByLabelText('Rate this collection')).toBeInTheDocument();
  });

  it('does NOT render the Rating section for the home collection', () => {
    render(
      <CollectionEditSheet
        edit={makeEdit({ editTab: 'structure', currentState: makeState({ slug: 'home' }) })}
      />
    );
    expect(screen.queryByRole('heading', { name: 'Rating' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rate this collection')).not.toBeInTheDocument();
  });

  it('renders the Rating section for a parent collection', () => {
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'structure',
          isParent: true,
          updateData: makeUpdateData({}),
        })}
      />
    );
    expect(screen.getByRole('heading', { name: 'Rating' })).toBeInTheDocument();
  });

  it('calls updateCollectionRating with the collection’s own id on change', () => {
    const updateCollectionRating = jest.fn();
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'structure',
          currentState: makeState({ id: 42 }),
          updateCollectionRating,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText('Rate this collection'));
    expect(updateCollectionRating).toHaveBeenCalledWith(42, 3);
  });
});

describe('CollectionEditSheet — StructureTab danger zone', () => {
  it('renders a Delete collection button on the Structure tab for a normal collection', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure' })} />);
    expect(screen.getByRole('button', { name: 'Delete collection' })).toBeInTheDocument();
  });

  it('hides the Delete collection button for the home collection', () => {
    render(
      <CollectionEditSheet
        edit={makeEdit({ editTab: 'structure', currentState: makeState({ slug: 'home' }) })}
      />
    );
    expect(screen.queryByRole('button', { name: 'Delete collection' })).not.toBeInTheDocument();
  });

  it('invokes handleDeleteCollection when the Delete collection button is clicked', () => {
    const handleDeleteCollection = jest.fn();
    render(
      <CollectionEditSheet edit={makeEdit({ editTab: 'structure', handleDeleteCollection })} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete collection' }));
    expect(handleDeleteCollection).toHaveBeenCalledTimes(1);
  });
});
