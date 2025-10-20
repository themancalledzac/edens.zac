import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';

import FilmStockSelector, { type NewFilmStockData } from './FilmStockSelector';

describe('FilmStockSelector', () => {
  const mockFilmTypes = [
    { id: 1, name: 'KODAK_PORTRA_400', displayName: 'Kodak Portra', defaultIso: 400 },
    { id: 2, name: 'KODAK_GOLD_200', displayName: 'Kodak Gold', defaultIso: 200 },
    { id: 3, name: 'ILFORD_HP5_PLUS', displayName: 'Ilford HP5 Plus', defaultIso: 400 },
  ];

  it('should render with current film stock', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    expect(screen.getByText('KODAK_PORTRA_400')).toBeDefined();
    expect(screen.getByText('Change ▼')).toBeDefined();
    expect(screen.getByText('+ Add New')).toBeDefined();
  });

  it('should show "No film stock set" when currentFilmStock is empty', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock=""
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    expect(screen.getByText('No film stock set')).toBeDefined();
  });

  it('should show "Will be added" indicator for new film stock', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="NEW_FILM_STOCK"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    expect(screen.getByText('🔴 Will be added')).toBeDefined();
  });

  it('should open dropdown when "Change" button is clicked', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    const changeButton = screen.getByText('Change ▼');
    fireEvent.click(changeButton);

    // Dropdown should show all available film types
    expect(screen.getByText('Kodak Portra (ISO 400) ✓')).toBeDefined();
    expect(screen.getByText('Kodak Gold (ISO 200)')).toBeDefined();
    expect(screen.getByText('Ilford HP5 Plus (ISO 400)')).toBeDefined();
  });

  it('should call onChange with filmTypeId when selecting a film stock from dropdown', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    // Open dropdown
    const changeButton = screen.getByText('Change ▼');
    fireEvent.click(changeButton);

    // Select a different film stock
    const filmStockButton = screen.getByText('Kodak Gold (ISO 200)');
    fireEvent.click(filmStockButton);

    expect(mockOnChange).toHaveBeenCalledWith('KODAK_GOLD_200', 2);
  });

  it('should show add new input when "+ Add New" button is clicked', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    const addNewButton = screen.getByText('+ Add New');
    fireEvent.click(addNewButton);

    expect(screen.getByPlaceholderText('e.g., Kodak Portra 400')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g., 400')).toBeDefined();
    expect(screen.getByText('Add Film Stock')).toBeDefined();
  });

  it('should call onAddNew when adding a new film stock with all required fields', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    // Click add new button
    const addNewButton = screen.getByText('+ Add New');
    fireEvent.click(addNewButton);

    // Enter new film stock data
    const displayNameInput = screen.getByPlaceholderText('e.g., Kodak Portra 400');
    fireEvent.change(displayNameInput, { target: { value: 'Fuji Superia 400' } });

    const defaultIsoInput = screen.getByPlaceholderText('e.g., 400');
    fireEvent.change(defaultIsoInput, { target: { value: '400' } });

    // Click add button
    const addButton = screen.getByText('Add Film Stock');
    fireEvent.click(addButton);

    const expectedData: NewFilmStockData = {
      filmTypeName: 'Fuji Superia 400',
      defaultIso: 400,
    };
    expect(mockOnAddNew).toHaveBeenCalledWith(expectedData);
  });

  it('should disable "Add Film Stock" button when fields are incomplete', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    // Click add new button
    const addNewButton = screen.getByText('+ Add New');
    fireEvent.click(addNewButton);

    // Button should be disabled initially
    const addButton = screen.getByText('Add Film Stock');
    expect(addButton).toHaveProperty('disabled', true);

    // Add only display name
    const displayNameInput = screen.getByPlaceholderText('e.g., Kodak Portra 400');
    fireEvent.change(displayNameInput, { target: { value: 'Fuji Superia 400' } });

    // Button should still be disabled (need ISO too)
    expect(addButton).toHaveProperty('disabled', true);
  });

  it('should close add new input when cancel is clicked', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    // Click add new button
    const addNewButton = screen.getByText('+ Add New');
    fireEvent.click(addNewButton);

    // Verify inputs are visible
    expect(screen.getByPlaceholderText('e.g., Kodak Portra 400')).toBeDefined();

    // Click cancel
    const cancelButtons = screen.getAllByText('Cancel');
    const cancelButton = cancelButtons.find(btn =>
      btn.className.includes('cancelSmallButton')
    );
    if (cancelButton) {
      fireEvent.click(cancelButton);
    }

    // Inputs should be gone
    expect(screen.queryByPlaceholderText('e.g., Kodak Portra 400')).toBeNull();
  });

  it('should handle Enter key to submit new film stock', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    // Click add new button
    const addNewButton = screen.getByText('+ Add New');
    fireEvent.click(addNewButton);

    // Enter all required data
    const displayNameInput = screen.getByPlaceholderText('e.g., Kodak Portra 400');
    fireEvent.change(displayNameInput, { target: { value: 'Fuji Superia 400' } });

    const defaultIsoInput = screen.getByPlaceholderText('e.g., 400');
    fireEvent.change(defaultIsoInput, { target: { value: '400' } });

    // Press Enter on the last input
    fireEvent.keyDown(defaultIsoInput, { key: 'Enter', code: 'Enter' });

    const expectedData: NewFilmStockData = {
      filmTypeName: 'Fuji Superia 400',
      defaultIso: 400,
    };
    expect(mockOnAddNew).toHaveBeenCalledWith(expectedData);
  });

  it('should handle Escape key to cancel new film stock', () => {
    const mockOnChange = jest.fn();
    const mockOnAddNew = jest.fn();

    render(
      <FilmStockSelector
        currentFilmStock="KODAK_PORTRA_400"
        availableFilmTypes={mockFilmTypes}
        onChange={mockOnChange}
        onAddNew={mockOnAddNew}
      />
    );

    // Click add new button
    const addNewButton = screen.getByText('+ Add New');
    fireEvent.click(addNewButton);

    // Enter some text and press Escape
    const displayNameInput = screen.getByPlaceholderText('e.g., Kodak Portra 400');
    fireEvent.change(displayNameInput, { target: { value: 'Fuji Superia 400' } });
    fireEvent.keyDown(displayNameInput, { key: 'Escape', code: 'Escape' });

    // Input should be gone and onAddNew should not have been called
    expect(screen.queryByPlaceholderText('e.g., Kodak Portra 400')).toBeNull();
    expect(mockOnAddNew).not.toHaveBeenCalled();
  });
});
