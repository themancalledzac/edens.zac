import { fireEvent, render, screen } from '@testing-library/react';

import { EditBar } from '@/app/components/ui/EditBar/EditBar';

describe('EditBar', () => {
  it('renders action cells and fires onClick', () => {
    const onSelect = jest.fn();
    render(
      <EditBar
        ariaLabel="Manage"
        cells={[
          { key: 'select', label: 'Select', onClick: onSelect },
          { key: 'edit', label: 'Edit', variant: 'primary' },
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('disables a cell when disabled is true', () => {
    render(<EditBar cells={[{ key: 'save', label: 'Save', disabled: true }]} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('renders a tab row and marks the active tab selected', () => {
    const onTabChange = jest.fn();
    render(
      <EditBar
        tabs={[
          { id: 'info', label: 'Info' },
          { id: 'tags', label: 'Tags' },
        ]}
        activeTab="info"
        onTabChange={onTabChange}
        cells={[{ key: 'save', label: 'Save' }]}
      />
    );
    expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Tags' }));
    expect(onTabChange).toHaveBeenCalledWith('tags');
  });

  it('renders an upload cell as a label with a file input', () => {
    const onFiles = jest.fn();
    render(
      <EditBar
        cells={[{ key: 'upload', label: 'Upload', fileInput: { multiple: true, onFiles } }]}
      />
    );
    expect(screen.getByText('Upload').tagName).toBe('LABEL');
  });
});
