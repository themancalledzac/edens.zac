import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import CollectionListSelector, {
  bucketOf,
  COLLECTION_BUCKET_LABELS,
  COLLECTION_BUCKET_ORDER,
  sortGroup,
} from '@/app/components/CollectionListSelector/CollectionListSelector';
import { type CollectionListModel } from '@/app/types/Collection';

const mockCollections: CollectionListModel[] = [
  { id: 1, name: 'Portfolio A', slug: 'portfolio-a' },
  { id: 2, name: 'Blog B', slug: 'blog-b', isBlog: true },
  { id: 3, name: 'Gallery C', slug: 'gallery-c', isClient: true },
  { id: 4, name: 'No Type D', slug: 'no-type-d' },
];

describe('CollectionListSelector', () => {
  const defaultProps = {
    allCollections: mockCollections,
    savedCollectionIds: new Set<number>(),
    pendingAddIds: new Set<number>(),
    pendingRemoveIds: new Set<number>(),
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all collections', () => {
    render(<CollectionListSelector {...defaultProps} />);

    expect(screen.getByText('Portfolio A')).toBeInTheDocument();
    expect(screen.getByText('Blog B')).toBeInTheDocument();
    expect(screen.getByText('Gallery C')).toBeInTheDocument();
    expect(screen.getByText('No Type D')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<CollectionListSelector {...defaultProps} label="My Collections" />);
    expect(screen.getByText('My Collections')).toBeInTheDocument();
  });

  it('defaults label to "Collections"', () => {
    // The COLLECTION bucket chip now also reads "Collections", so scope to the list's own
    // <label> element rather than matching bare text.
    render(<CollectionListSelector {...defaultProps} />);
    expect(screen.getByText('Collections', { selector: 'label' })).toBeInTheDocument();
  });

  it('excludes collection by excludeCollectionId', () => {
    render(<CollectionListSelector {...defaultProps} excludeCollectionId={2} />);

    expect(screen.getByText('Portfolio A')).toBeInTheDocument();
    expect(screen.queryByText('Blog B')).not.toBeInTheDocument();
    expect(screen.getByText('Gallery C')).toBeInTheDocument();
  });

  it('labels each row with its derived bucket in single-column mode', () => {
    render(<CollectionListSelector {...defaultProps} />);
    // Portfolio A and No Type D are plain collections; Blog B and Gallery C are not.
    expect(screen.getAllByText('Collections')).toHaveLength(3); // 2 rows + the list label
    expect(screen.getByText('Blogs')).toBeInTheDocument();
    expect(screen.getByText('Client Galleries')).toBeInTheDocument();
  });

  it('fires onToggle when checkbox is clicked', () => {
    const onToggle = jest.fn();
    render(<CollectionListSelector {...defaultProps} onToggle={onToggle} />);

    const checkbox = screen.getByLabelText('Toggle Portfolio A');
    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(mockCollections[0]);
  });

  it('fires onNavigate on row click when provided', () => {
    const onToggle = jest.fn();
    const onNavigate = jest.fn();
    render(
      <CollectionListSelector {...defaultProps} onToggle={onToggle} onNavigate={onNavigate} />
    );

    // Click on the name text (row click, not checkbox)
    fireEvent.click(screen.getByText('Blog B'));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(mockCollections[1]);
    // onToggle should NOT be called for row click when onNavigate is provided
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('fires onToggle on row click when onNavigate is not provided', () => {
    const onToggle = jest.fn();
    render(<CollectionListSelector {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByText('Gallery C'));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(mockCollections[2]);
  });

  it('checkbox click does not trigger row click handler', () => {
    const onToggle = jest.fn();
    const onNavigate = jest.fn();
    render(
      <CollectionListSelector {...defaultProps} onToggle={onToggle} onNavigate={onNavigate} />
    );

    const checkbox = screen.getByLabelText('Toggle Portfolio A');
    fireEvent.click(checkbox);

    // Only onToggle should fire, not onNavigate
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('renders correct checkbox states', () => {
    render(
      <CollectionListSelector
        {...defaultProps}
        savedCollectionIds={new Set([1])}
        pendingAddIds={new Set([2])}
        pendingRemoveIds={new Set([3])}
      />
    );

    const checkbox1 = screen.getByLabelText('Toggle Portfolio A');
    const checkbox2 = screen.getByLabelText('Toggle Blog B');
    const checkbox3 = screen.getByLabelText('Toggle Gallery C');
    const checkbox4 = screen.getByLabelText('Toggle No Type D');

    expect(checkbox1.className).toContain('saved');
    expect(checkbox2.className).toContain('pending-add');
    expect(checkbox3.className).toContain('pending-remove');
    expect(checkbox4.className).toContain('empty');
  });

  it('shows empty state when no collections', () => {
    render(<CollectionListSelector {...defaultProps} allCollections={[]} />);
    expect(screen.getByText('No collections available')).toBeInTheDocument();
  });

  it('shows empty state when all collections are excluded', () => {
    render(
      <CollectionListSelector
        {...defaultProps}
        allCollections={[{ id: 5, name: 'Only One' }]}
        excludeCollectionId={5}
      />
    );
    expect(screen.getByText('No collections available')).toBeInTheDocument();
  });

  describe('keyboard navigation', () => {
    it('triggers toggle on Enter key press on row', () => {
      const onToggle = jest.fn();
      render(<CollectionListSelector {...defaultProps} onToggle={onToggle} />);

      const _rows = screen.getAllByRole('button', { hidden: false });
      // Rows with role="button" are the collection rows (checkboxes also have role button)
      // Find the row for 'Portfolio A' by getting the div with role=button containing that text
      const portfolioRow = screen.getByText('Portfolio A').closest('[role="button"]');
      fireEvent.keyDown(portfolioRow!, { key: 'Enter' });

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(mockCollections[0]);
    });

    it('triggers toggle on Space key press on row', () => {
      const onToggle = jest.fn();
      render(<CollectionListSelector {...defaultProps} onToggle={onToggle} />);

      const blogRow = screen.getByText('Blog B').closest('[role="button"]');
      fireEvent.keyDown(blogRow!, { key: ' ' });

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(mockCollections[1]);
    });

    it('does not trigger toggle on other keys', () => {
      const onToggle = jest.fn();
      render(<CollectionListSelector {...defaultProps} onToggle={onToggle} />);

      const galleryRow = screen.getByText('Gallery C').closest('[role="button"]');
      fireEvent.keyDown(galleryRow!, { key: 'Tab' });

      expect(onToggle).not.toHaveBeenCalled();
    });

    it('triggers onNavigate on Enter key press when onNavigate is provided', () => {
      const onToggle = jest.fn();
      const onNavigate = jest.fn();
      render(
        <CollectionListSelector {...defaultProps} onToggle={onToggle} onNavigate={onNavigate} />
      );

      const portfolioRow = screen.getByText('Portfolio A').closest('[role="button"]');
      fireEvent.keyDown(portfolioRow!, { key: 'Enter' });

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(mockCollections[0]);
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('onAddNewChild', () => {
    it('renders "Add New Child" button when onAddNewChild prop is provided', () => {
      const onAddNewChild = jest.fn();
      render(<CollectionListSelector {...defaultProps} onAddNewChild={onAddNewChild} />);

      expect(screen.getByText('Add New Child')).toBeInTheDocument();
    });

    it('calls onAddNewChild callback when button is clicked', () => {
      const onAddNewChild = jest.fn();
      render(<CollectionListSelector {...defaultProps} onAddNewChild={onAddNewChild} />);

      fireEvent.click(screen.getByText('Add New Child'));

      expect(onAddNewChild).toHaveBeenCalledTimes(1);
    });

    it('does not render "Add New Child" button when prop is not provided', () => {
      render(<CollectionListSelector {...defaultProps} />);

      expect(screen.queryByText('Add New Child')).not.toBeInTheDocument();
    });
  });

  describe('two-column sibling mode', () => {
    const twoColProps = {
      allCollections: mockCollections,
      savedCollectionIds: new Set<number>([1]),
      pendingAddIds: new Set<number>(),
      pendingRemoveIds: new Set<number>(),
      onToggle: jest.fn(),
      siblingSavedIds: new Set<number>([2]),
      siblingPendingAddIds: new Set<number>(),
      siblingPendingRemoveIds: new Set<number>(),
      onToggleSibling: jest.fn(),
    };
    beforeEach(() => jest.clearAllMocks());

    it('renders Sibling and Child column headers when sibling props are provided', () => {
      render(<CollectionListSelector {...twoColProps} />);
      expect(screen.getByText('Sibling')).toBeInTheDocument();
      expect(screen.getByText('Child')).toBeInTheDocument();
    });
    it('exposes a Sibling and a Child toggle per collection row', () => {
      render(<CollectionListSelector {...twoColProps} />);
      // Portfolio A lives in the (default-collapsed) PORTFOLIO accordion section — expand it first.
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      expect(screen.getByLabelText('Toggle sibling Portfolio A')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle child Portfolio A')).toBeInTheDocument();
    });
    it('fires onToggleSibling (not onToggle) when the Sibling checkbox is clicked', () => {
      const onToggle = jest.fn();
      const onToggleSibling = jest.fn();
      render(
        <CollectionListSelector
          {...twoColProps}
          onToggle={onToggle}
          onToggleSibling={onToggleSibling}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      fireEvent.click(screen.getByLabelText('Toggle sibling Portfolio A'));
      expect(onToggleSibling).toHaveBeenCalledTimes(1);
      expect(onToggleSibling).toHaveBeenCalledWith(mockCollections[0]);
      expect(onToggle).not.toHaveBeenCalled();
    });
    it('fires onToggle (not onToggleSibling) when the Child checkbox is clicked', () => {
      const onToggle = jest.fn();
      const onToggleSibling = jest.fn();
      render(
        <CollectionListSelector
          {...twoColProps}
          onToggle={onToggle}
          onToggleSibling={onToggleSibling}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      fireEvent.click(screen.getByLabelText('Toggle child Portfolio A'));
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(mockCollections[0]);
      expect(onToggleSibling).not.toHaveBeenCalled();
    });
    it('reflects independent saved state per column (sibling on B, child on A)', () => {
      // Child-saved (id 1) and sibling-saved (id 2) rows must be visible together, but the accordion
      // only opens ONE section at a time — put both rows in a single PORTFOLIO section so one expand
      // reveals both. Ids/saved-sets are unchanged, so the per-column saved/empty assertions hold.
      const sameSection: CollectionListModel[] = [
        { id: 1, name: 'Portfolio A', slug: 'portfolio-a' },
        { id: 2, name: 'Blog B', slug: 'blog-b' },
      ];
      render(<CollectionListSelector {...twoColProps} allCollections={sameSection} />);
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      expect(screen.getByLabelText('Toggle child Portfolio A').className).toContain('saved');
      expect(screen.getByLabelText('Toggle sibling Blog B').className).toContain('saved');
      expect(screen.getByLabelText('Toggle sibling Portfolio A').className).toContain('empty');
      expect(screen.getByLabelText('Toggle child Blog B').className).toContain('empty');
    });
    it('still omits the excludeCollectionId row in two-column mode', () => {
      render(<CollectionListSelector {...twoColProps} excludeCollectionId={2} />);
      // Portfolio A lives in the collapsed PORTFOLIO section — expand it to assert it renders.
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      expect(screen.getByText('Portfolio A')).toBeInTheDocument();
      expect(screen.queryByText('Blog B')).not.toBeInTheDocument();
    });
    it('fires onNavigate when the name is clicked in sibling mode', () => {
      const onNavigate = jest.fn();
      const onToggle = jest.fn();
      const onToggleSibling = jest.fn();
      render(
        <CollectionListSelector
          {...twoColProps}
          onToggle={onToggle}
          onToggleSibling={onToggleSibling}
          onNavigate={onNavigate}
        />
      );

      // Blog B lives in the collapsed BLOG section — expand it before clicking its name button.
      fireEvent.click(screen.getByRole('button', { name: /Blogs/ }));
      fireEvent.click(screen.getByLabelText('Open Blog B'));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(mockCollections[1]);
      expect(onToggle).not.toHaveBeenCalled();
      expect(onToggleSibling).not.toHaveBeenCalled();
    });
    it('renders the name as a plain span (no nav button) when onNavigate is not provided', () => {
      render(<CollectionListSelector {...twoColProps} />);
      expect(screen.queryByLabelText('Open Portfolio A')).not.toBeInTheDocument();
    });
  });

  describe('child/parent mutual exclusion', () => {
    it('disables Parent checkbox when row is currently checked as Child', () => {
      const onToggleParent = jest.fn();
      render(
        <CollectionListSelector
          allCollections={[{ id: 10, name: 'X', slug: 'x' }]}
          savedCollectionIds={new Set([10])}
          pendingAddIds={new Set()}
          pendingRemoveIds={new Set()}
          onToggle={jest.fn()}
          siblingSavedIds={new Set()}
          siblingPendingAddIds={new Set()}
          siblingPendingRemoveIds={new Set()}
          onToggleSibling={jest.fn()}
          parentSavedIds={new Set()}
          parentPendingAddIds={new Set()}
          parentPendingRemoveIds={new Set()}
          onToggleParent={onToggleParent}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      const btn = screen.getByLabelText('Toggle parent X');
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(btn);
      expect(onToggleParent).not.toHaveBeenCalled();
    });

    it('disables Child checkbox when row is currently checked as Parent', () => {
      const onToggleChild = jest.fn();
      render(
        <CollectionListSelector
          allCollections={[{ id: 11, name: 'Y', slug: 'y' }]}
          savedCollectionIds={new Set()}
          pendingAddIds={new Set()}
          pendingRemoveIds={new Set()}
          onToggle={onToggleChild}
          siblingSavedIds={new Set()}
          siblingPendingAddIds={new Set()}
          siblingPendingRemoveIds={new Set()}
          onToggleSibling={jest.fn()}
          parentSavedIds={new Set([11])}
          parentPendingAddIds={new Set()}
          parentPendingRemoveIds={new Set()}
          onToggleParent={jest.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      expect(screen.getByLabelText('Toggle child Y')).toHaveAttribute('aria-disabled', 'true');
    });

    it('does NOT disable Parent when row is saved-but-pending-removal as Child', () => {
      render(
        <CollectionListSelector
          allCollections={[{ id: 12, name: 'Z', slug: 'z' }]}
          savedCollectionIds={new Set([12])}
          pendingAddIds={new Set()}
          pendingRemoveIds={new Set([12])}
          onToggle={jest.fn()}
          siblingSavedIds={new Set()}
          siblingPendingAddIds={new Set()}
          siblingPendingRemoveIds={new Set()}
          onToggleSibling={jest.fn()}
          parentSavedIds={new Set()}
          parentPendingAddIds={new Set()}
          parentPendingRemoveIds={new Set()}
          onToggleParent={jest.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      expect(screen.getByLabelText('Toggle parent Z')).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('pinnedCollectionId', () => {
    // Single-column rows are role="button" elements that contain the collection name; the checkbox
    // buttons render empty. Filtering to text-bearing buttons yields the rows in DOM order.
    const getRowsInOrder = () =>
      screen
        .getAllByRole('button')
        .filter(el => el.textContent && el.textContent.trim().length > 0);

    it('sorts the pinned collection to the top, keeping all other rows in order', () => {
      render(<CollectionListSelector {...defaultProps} pinnedCollectionId={3} />);

      const rows = getRowsInOrder();
      expect(rows[0]).toHaveTextContent('Gallery C'); // id 3 pinned to top
      expect(rows[1]).toHaveTextContent('Portfolio A');
      expect(rows[2]).toHaveTextContent('Blog B');
      expect(rows[3]).toHaveTextContent('No Type D');
    });

    it('keeps the pinned collection visible and reflects its saved (green) state', () => {
      render(
        <CollectionListSelector
          {...defaultProps}
          pinnedCollectionId={3}
          savedCollectionIds={new Set([3])}
        />
      );

      const checkbox = screen.getByLabelText('Toggle Gallery C');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.className).toContain('saved');
    });

    it('leaves order unchanged when pinnedCollectionId is not in the list', () => {
      render(<CollectionListSelector {...defaultProps} pinnedCollectionId={999} />);

      const rows = getRowsInOrder();
      expect(rows[0]).toHaveTextContent('Portfolio A');
      expect(rows[1]).toHaveTextContent('Blog B');
      expect(rows[2]).toHaveTextContent('Gallery C');
      expect(rows[3]).toHaveTextContent('No Type D');
    });
  });
});

describe('COLLECTION_BUCKET_ORDER', () => {
  it('lists Home first, then Client Galleries, Blogs, Collections', () => {
    expect(COLLECTION_BUCKET_ORDER).toEqual(['HOME', 'CLIENT_GALLERY', 'BLOG', 'COLLECTION']);
  });
});

describe('COLLECTION_BUCKET_LABELS', () => {
  it('has a non-empty label for every bucket', () => {
    for (const b of COLLECTION_BUCKET_ORDER) expect(COLLECTION_BUCKET_LABELS[b]).toBeTruthy();
  });
});

describe('bucketOf', () => {
  it('puts the home slug in HOME even when it carries other flags', () => {
    expect(bucketOf({ id: 1, name: 'Home', slug: 'home' })).toBe('HOME');
    expect(bucketOf({ id: 1, name: 'Home', slug: 'home', isBlog: true })).toBe('HOME');
  });

  it('puts an isClient row in CLIENT_GALLERY', () => {
    expect(bucketOf({ id: 2, name: 'G', slug: 'g', isClient: true })).toBe('CLIENT_GALLERY');
  });

  it('puts an isBlog row in BLOG', () => {
    expect(bucketOf({ id: 3, name: 'B', slug: 'b', isBlog: true })).toBe('BLOG');
  });

  it('puts everything else in COLLECTION, including a row with no flags at all', () => {
    expect(bucketOf({ id: 4, name: 'C', slug: 'c' })).toBe('COLLECTION');
    expect(bucketOf({ id: 5, name: 'C', slug: 'c', isClient: false, isBlog: false })).toBe(
      'COLLECTION'
    );
  });
});

describe('sortGroup', () => {
  it('sorts BLOG by collectionDate desc, null last', () => {
    const sorted = sortGroup(
      [
        { id: 1, name: 'B', collectionDate: '2025-01-15' },
        { id: 2, name: 'C', collectionDate: null },
        { id: 3, name: 'A', collectionDate: '2025-06-01' },
      ],
      'BLOG'
    );
    expect(sorted.map(c => c.id)).toEqual([3, 1, 2]);
  });

  it('sorts a non-blog bucket alphabetically by name', () => {
    const sorted = sortGroup(
      [
        { id: 1, name: 'Charlie' },
        { id: 2, name: 'Alpha' },
        { id: 3, name: 'Bravo' },
      ],
      'COLLECTION'
    );
    expect(sorted.map(c => c.id)).toEqual([2, 3, 1]);
  });

  it('falls back to name when both BLOG entries have null collectionDate', () => {
    const sorted = sortGroup(
      [
        { id: 1, name: 'B', collectionDate: null },
        { id: 2, name: 'A', collectionDate: null },
      ],
      'BLOG'
    );
    expect(sorted.map(c => c.id)).toEqual([2, 1]);
  });
});

describe('three-column accordion mode', () => {
  const allTypes: CollectionListModel[] = [
    { id: 1, name: 'Home', slug: 'home' },
    { id: 2, name: 'P1', slug: 'p1' },
    { id: 3, name: 'P2', slug: 'p2' },
    { id: 4, name: 'B1', slug: 'b1', isBlog: true, collectionDate: '2025-01-01' },
    { id: 5, name: 'B2', slug: 'b2', isBlog: true, collectionDate: '2025-06-01' },
    { id: 6, name: 'G1', slug: 'g1', isClient: true },
  ];

  function renderInThreeColumnMode(rows = allTypes) {
    return render(
      <CollectionListSelector
        allCollections={rows}
        savedCollectionIds={new Set()}
        pendingAddIds={new Set()}
        pendingRemoveIds={new Set()}
        onToggle={jest.fn()}
        siblingSavedIds={new Set()}
        siblingPendingAddIds={new Set()}
        siblingPendingRemoveIds={new Set()}
        onToggleSibling={jest.fn()}
        parentSavedIds={new Set()}
        parentPendingAddIds={new Set()}
        parentPendingRemoveIds={new Set()}
        onToggleParent={jest.fn()}
      />
    );
  }

  it('renders Collection Name header (not Catalog Name) in 3-column mode', () => {
    renderInThreeColumnMode();
    expect(screen.getByText('Collection Name')).toBeInTheDocument();
    expect(screen.queryByText('Catalog Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Catalog Type')).not.toBeInTheDocument();
  });

  it('renders Parent column header', () => {
    // There is no PARENT bucket any more, so "Parent" now renders exactly once — as the
    // column header. The `within(columnHeaderRow)` scoping that disambiguated it is dead.
    renderInThreeColumnMode();
    expect(screen.getByText('Parent')).toBeInTheDocument();
  });

  it('renders HOME row always visible at top, no Home accordion header', () => {
    renderInThreeColumnMode();
    // The pinned HOME row renders its name as a plain span (no onNavigate → no nav button),
    // and HOME has no accordion header — so there is no button named exactly "Home".
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Home$/ })).toHaveLength(0);
  });

  it('renders 3 collapsed non-Home bucket headers by default; no rows beneath', () => {
    renderInThreeColumnMode();
    for (const l of ['Client Galleries', 'Blogs']) {
      expect(screen.getByRole('button', { name: new RegExp(l) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /Collections/ })).toBeInTheDocument();
    expect(screen.queryByText('P1')).not.toBeInTheDocument();
    expect(screen.queryByText('B1')).not.toBeInTheDocument();
  });

  it('expand-collapse accordion: opening Blogs closes Collections', () => {
    renderInThreeColumnMode();
    fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Blogs/ }));
    expect(screen.queryByText('P1')).not.toBeInTheDocument();
    expect(screen.getByText('B1')).toBeInTheDocument();
    expect(screen.getByText('B2')).toBeInTheDocument();
  });

  it('BLOG group renders rows in collectionDate desc order', () => {
    renderInThreeColumnMode();
    fireEvent.click(screen.getByRole('button', { name: /Blogs/ }));
    const rows = screen.getAllByText(/^B\d$/);
    expect(rows.map(r => r.textContent)).toEqual(['B2', 'B1']);
  });

  it('Collections bucket renders rows alphabetically', () => {
    renderInThreeColumnMode([
      { id: 1, name: 'Charlie', slug: 'charlie' },
      { id: 2, name: 'Alpha', slug: 'alpha' },
      { id: 3, name: 'Bravo', slug: 'bravo' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
    const names = screen.getAllByText(/Charlie|Alpha|Bravo/);
    expect(names.map(n => n.textContent)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('leaves the Sibling checkbox unaffected when the row is actively a Child', () => {
    // Mutual exclusion only governs Child↔Parent, never Sibling. A row saved as a
    // Child must still expose an enabled, clickable Sibling toggle.
    const onToggleSibling = jest.fn();
    render(
      <CollectionListSelector
        allCollections={[{ id: 20, name: 'Active Child', slug: 'active-child' }]}
        savedCollectionIds={new Set([20])}
        pendingAddIds={new Set()}
        pendingRemoveIds={new Set()}
        onToggle={jest.fn()}
        siblingSavedIds={new Set()}
        siblingPendingAddIds={new Set()}
        siblingPendingRemoveIds={new Set()}
        onToggleSibling={onToggleSibling}
        parentSavedIds={new Set()}
        parentPendingAddIds={new Set()}
        parentPendingRemoveIds={new Set()}
        onToggleParent={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
    const siblingBtn = screen.getByLabelText('Toggle sibling Active Child');
    expect(siblingBtn).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(siblingBtn);
    expect(onToggleSibling).toHaveBeenCalledTimes(1);
  });

  it('fires onToggleParent when the Parent checkbox is clicked on a plain row', () => {
    const onToggleParent = jest.fn();
    render(
      <CollectionListSelector
        allCollections={[{ id: 21, name: 'Plain Row', slug: 'plain-row' }]}
        savedCollectionIds={new Set()}
        pendingAddIds={new Set()}
        pendingRemoveIds={new Set()}
        onToggle={jest.fn()}
        siblingSavedIds={new Set()}
        siblingPendingAddIds={new Set()}
        siblingPendingRemoveIds={new Set()}
        onToggleSibling={jest.fn()}
        parentSavedIds={new Set()}
        parentPendingAddIds={new Set()}
        parentPendingRemoveIds={new Set()}
        onToggleParent={onToggleParent}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
    const parentBtn = screen.getByLabelText('Toggle parent Plain Row');
    expect(parentBtn).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(parentBtn);
    expect(onToggleParent).toHaveBeenCalledTimes(1);
    expect(onToggleParent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 21, name: 'Plain Row' })
    );
  });

  it('applies the expandedRow class to rows revealed under an open section', () => {
    // CSS modules are mocked by next/jest as an identity proxy, so
    // `styles.expandedRow === 'expandedRow'` — query by the literal class name.
    const { container } = renderInThreeColumnMode();
    expect(container.querySelector('.expandedRow')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
    expect(container.querySelector('.expandedRow')).not.toBeNull();
  });

  it('buckets a row with no flags at all under Collections', () => {
    // There is no unknown-type case any more: every row has a bucket by construction.
    renderInThreeColumnMode([{ id: 30, name: 'Weird Row', slug: 'weird-row' }]);
    expect(screen.queryByText('Weird Row')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
    expect(screen.getByText('Weird Row')).toBeInTheDocument();
  });

  describe('currentCollectionId (you-are-here marker)', () => {
    // Same render helper as the rest of the suite, plus a currentCollectionId prop. P1 (id 2)
    // is a PORTFOLIO row used as the "current" collection across these cases.
    function renderWithCurrent(currentCollectionId: number, rows = allTypes) {
      return render(
        <CollectionListSelector
          allCollections={rows}
          savedCollectionIds={new Set()}
          pendingAddIds={new Set()}
          pendingRemoveIds={new Set()}
          onToggle={jest.fn()}
          siblingSavedIds={new Set()}
          siblingPendingAddIds={new Set()}
          siblingPendingRemoveIds={new Set()}
          onToggleSibling={jest.fn()}
          parentSavedIds={new Set()}
          parentPendingAddIds={new Set()}
          parentPendingRemoveIds={new Set()}
          onToggleParent={jest.fn()}
          currentCollectionId={currentCollectionId}
        />
      );
    }

    it('keeps the current row visible (not excluded) with all toggles disabled', () => {
      // P1 (id 2) is the current collection — its PORTFOLIO section auto-opens, so the row
      // is present without any click. The excludeCollectionId path would have removed it.
      renderWithCurrent(2);
      expect(screen.getByText('P1')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle sibling P1')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByLabelText('Toggle child P1')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByLabelText('Toggle parent P1')).toHaveAttribute('aria-disabled', 'true');
    });

    it("auto-opens the current collection's bucket on load, leaving others collapsed", () => {
      renderWithCurrent(2); // PORTFOLIO
      // PORTFOLIO is open by default → P1/P2 visible without clicking the header.
      expect(screen.getByText('P1')).toBeInTheDocument();
      expect(screen.getByText('P2')).toBeInTheDocument();
      // A different section (BLOG) stays collapsed.
      expect(screen.queryByText('B1')).not.toBeInTheDocument();
      expect(screen.queryByText('B2')).not.toBeInTheDocument();
    });

    it("renders the '(current)' marker for the current row", () => {
      renderWithCurrent(2);
      expect(screen.getByText('(current)')).toBeInTheDocument();
    });

    it('does not render a navigate button for the current row', () => {
      // The current collection must not self-navigate — no "Open P1" button.
      render(
        <CollectionListSelector
          allCollections={allTypes}
          savedCollectionIds={new Set()}
          pendingAddIds={new Set()}
          pendingRemoveIds={new Set()}
          onToggle={jest.fn()}
          onNavigate={jest.fn()}
          siblingSavedIds={new Set()}
          siblingPendingAddIds={new Set()}
          siblingPendingRemoveIds={new Set()}
          onToggleSibling={jest.fn()}
          parentSavedIds={new Set()}
          parentPendingAddIds={new Set()}
          parentPendingRemoveIds={new Set()}
          onToggleParent={jest.fn()}
          currentCollectionId={2}
        />
      );
      expect(screen.queryByLabelText('Open P1')).not.toBeInTheDocument();
      // A non-current PORTFOLIO sibling (P2) still navigates.
      expect(screen.getByLabelText('Open P2')).toBeInTheDocument();
    });

    it('still excludes (not greys) a row passed via excludeCollectionId', () => {
      // excludeCollectionId behavior is independent of currentCollectionId and still removes
      // the row entirely. Expand PORTFOLIO to assert P1 is absent while P2 remains.
      render(
        <CollectionListSelector
          allCollections={allTypes}
          savedCollectionIds={new Set()}
          pendingAddIds={new Set()}
          pendingRemoveIds={new Set()}
          onToggle={jest.fn()}
          siblingSavedIds={new Set()}
          siblingPendingAddIds={new Set()}
          siblingPendingRemoveIds={new Set()}
          onToggleSibling={jest.fn()}
          parentSavedIds={new Set()}
          parentPendingAddIds={new Set()}
          parentPendingRemoveIds={new Set()}
          onToggleParent={jest.fn()}
          excludeCollectionId={2}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Collections/ }));
      expect(screen.queryByText('P1')).not.toBeInTheDocument();
      expect(screen.getByText('P2')).toBeInTheDocument();
    });
  });
});

describe('derived tag-view rows', () => {
  const derivedRow: CollectionListModel = {
    id: -99,
    name: 'Sunsets',
    slug: 'sunsets',
    derived: true,
  };

  const baseProps = {
    allCollections: [derivedRow],
    savedCollectionIds: new Set<number>(),
    pendingAddIds: new Set<number>(),
    pendingRemoveIds: new Set<number>(),
    onToggle: jest.fn(),
    // parentMode engages accordion; derived rows land in the Collections bucket.
    parentSavedIds: new Set<number>(),
    parentPendingAddIds: new Set<number>(),
    parentPendingRemoveIds: new Set<number>(),
    onToggleParent: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  // A tag view is neither a client gallery nor a blog, so it buckets to Collections. The
  // bucket header collides with the selector's own default `label="Collections"`, so reach
  // it by role — the count suffix makes the accessible name unambiguous.
  const expandCollectionsSection = () =>
    fireEvent.click(screen.getByRole('button', { name: /Collections \(1\)/ }));

  it('renders the derived row read-only (toggles disabled) and never fires toggle handlers', () => {
    const onToggle = jest.fn();
    const onToggleParent = jest.fn();
    render(
      <CollectionListSelector
        {...baseProps}
        onToggle={onToggle}
        onToggleParent={onToggleParent}
        onSaveDerived={jest.fn()}
      />
    );
    expandCollectionsSection();
    const childToggle = screen.getByLabelText('Toggle child Sunsets');
    expect(childToggle.className).toContain('disabled');
    fireEvent.click(childToggle);
    fireEvent.click(screen.getByLabelText('Toggle parent Sunsets'));
    expect(onToggle).not.toHaveBeenCalled();
    expect(onToggleParent).not.toHaveBeenCalled();
  });

  it('fires onSaveDerived with the row when the Save as Collection action is clicked', () => {
    const onSaveDerived = jest.fn();
    render(<CollectionListSelector {...baseProps} onSaveDerived={onSaveDerived} />);
    expandCollectionsSection();
    fireEvent.click(screen.getByText('Save as Collection'));
    expect(onSaveDerived).toHaveBeenCalledTimes(1);
    expect(onSaveDerived).toHaveBeenCalledWith(derivedRow);
  });

  it('omits the Save as Collection action when onSaveDerived is not provided', () => {
    render(<CollectionListSelector {...baseProps} />);
    expandCollectionsSection();
    expect(screen.queryByText('Save as Collection')).not.toBeInTheDocument();
  });
});
