import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import CollectionListSelector, {
  COLLECTION_TYPE_ORDER,
  sortGroup,
} from '@/app/components/CollectionListSelector/CollectionListSelector';
import type { CollectionListModel } from '@/app/types/Collection';

const mockCollections: CollectionListModel[] = [
  { id: 1, name: 'Portfolio A', slug: 'portfolio-a', type: 'PORTFOLIO' },
  { id: 2, name: 'Blog B', slug: 'blog-b', type: 'BLOG' },
  { id: 3, name: 'Gallery C', slug: 'gallery-c', type: 'ART_GALLERY' },
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
    render(<CollectionListSelector {...defaultProps} />);
    expect(screen.getByText('Collections')).toBeInTheDocument();
  });

  it('excludes collection by excludeCollectionId', () => {
    render(<CollectionListSelector {...defaultProps} excludeCollectionId={2} />);

    expect(screen.getByText('Portfolio A')).toBeInTheDocument();
    expect(screen.queryByText('Blog B')).not.toBeInTheDocument();
    expect(screen.getByText('Gallery C')).toBeInTheDocument();
  });

  it('shows "Portfolio" as default type when collection.type is undefined', () => {
    render(<CollectionListSelector {...defaultProps} />);
    // Collection 4 has no type — should show "Portfolio"
    const typeElements = screen.getAllByText('Portfolio');
    expect(typeElements.length).toBeGreaterThanOrEqual(1);
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
      fireEvent.click(screen.getByLabelText('Toggle child Portfolio A'));
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(mockCollections[0]);
      expect(onToggleSibling).not.toHaveBeenCalled();
    });
    it('reflects independent saved state per column (sibling on B, child on A)', () => {
      render(<CollectionListSelector {...twoColProps} />);
      expect(screen.getByLabelText('Toggle child Portfolio A').className).toContain('saved');
      expect(screen.getByLabelText('Toggle sibling Blog B').className).toContain('saved');
      expect(screen.getByLabelText('Toggle sibling Portfolio A').className).toContain('empty');
      expect(screen.getByLabelText('Toggle child Blog B').className).toContain('empty');
    });
    it('still omits the excludeCollectionId row in two-column mode', () => {
      render(<CollectionListSelector {...twoColProps} excludeCollectionId={2} />);
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

describe('COLLECTION_TYPE_ORDER', () => {
  it('lists HOME first then PARENT, CLIENT_GALLERY, ART_GALLERY, PORTFOLIO, BLOG, MISC', () => {
    expect(COLLECTION_TYPE_ORDER).toEqual([
      'HOME',
      'PARENT',
      'CLIENT_GALLERY',
      'ART_GALLERY',
      'PORTFOLIO',
      'BLOG',
      'MISC',
    ]);
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

  it('sorts non-BLOG alphabetically by name', () => {
    const sorted = sortGroup(
      [
        { id: 1, name: 'Charlie' },
        { id: 2, name: 'Alpha' },
        { id: 3, name: 'Bravo' },
      ],
      'PORTFOLIO'
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
