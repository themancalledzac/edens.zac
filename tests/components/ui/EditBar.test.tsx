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

  it('tab buttons render id and aria-controls derived from tab key', () => {
    render(
      <EditBar
        tabs={[
          { id: 'info', label: 'Info' },
          { id: 'camera', label: 'Camera' },
        ]}
        activeTab="info"
        onTabChange={jest.fn()}
        cells={[{ key: 'save', label: 'Save' }]}
      />
    );
    const infoTab = screen.getByRole('tab', { name: 'Info' });
    expect(infoTab).toHaveAttribute('id', 'tab-info');
    expect(infoTab).toHaveAttribute('aria-controls', 'tabpanel-info');

    const cameraTab = screen.getByRole('tab', { name: 'Camera' });
    expect(cameraTab).toHaveAttribute('id', 'tab-camera');
    expect(cameraTab).toHaveAttribute('aria-controls', 'tabpanel-camera');
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

  it('fileInput cell with disabled:true — input is disabled and onFiles is NOT called on change', () => {
    const onFiles = jest.fn();
    const { container } = render(
      <EditBar
        cells={[
          {
            key: 'upload',
            label: 'Upload',
            disabled: true,
            fileInput: { multiple: true, onFiles },
          },
        ]}
      />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.disabled).toBe(true);

    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('fileInput cell enabled — onFiles is called and input value is reset after selection', () => {
    const onFiles = jest.fn();
    const { container } = render(
      <EditBar
        cells={[
          {
            key: 'upload',
            label: 'Upload',
            fileInput: { multiple: true, onFiles },
          },
        ]}
      />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.disabled).toBe(false);

    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledTimes(1);
    // value should be reset so the same file can be re-selected
    expect(input.value).toBe('');
  });

  it('applies the fixed class when fixed=true (default)', () => {
    const { container } = render(<EditBar cells={[{ key: 'save', label: 'Save' }]} />);
    expect(container.firstElementChild?.className).toMatch(/fixed/);
  });

  it('applies the static class (not fixed) when fixed=false', () => {
    const { container } = render(
      <EditBar fixed={false} cells={[{ key: 'save', label: 'Save' }]} />
    );
    expect(container.firstElementChild?.className).toMatch(/static/);
    expect(container.firstElementChild?.className).not.toMatch(/fixed/);
  });
});
