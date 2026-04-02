import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
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

    // Saved → checkbox--saved class
    expect(checkbox1.className).toContain('saved');
    // Pending add → checkbox--pending-add class
    expect(checkbox2.className).toContain('pending-add');
    // Pending remove → checkbox--pending-remove class
    expect(checkbox3.className).toContain('pending-remove');
    // Empty → checkbox--empty class
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
});
