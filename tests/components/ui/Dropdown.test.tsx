import { fireEvent, render, screen } from '@testing-library/react';

import Dropdown, { type MetadataItem } from '@/app/components/ui/Dropdown/Dropdown';

interface TagItem extends MetadataItem {
  id: number;
  name: string;
}

// Fixed-length tuple so OPTIONS[0]/OPTIONS[1] are non-optional under
// noUncheckedIndexedAccess (still assignable to the component's options: T[]).
const OPTIONS: [TagItem, TagItem] = [
  { id: 1, name: 'Mountains' },
  { id: 2, name: 'Ocean' },
];

describe('Dropdown', () => {
  it('renders the label and the empty-state trigger, with the list closed', () => {
    render(<Dropdown<TagItem> label="Tags" multiSelect options={OPTIONS} onChange={jest.fn()} />);
    // Trigger is a role="button" whose aria-label includes the empty text.
    expect(screen.getByRole('button', { name: /tags: no tags set/i })).toBeInTheDocument();
    // Options are not rendered until opened.
    expect(screen.queryByRole('button', { name: 'Mountains' })).not.toBeInTheDocument();
  });

  it('opens on trigger click and lists every option', () => {
    render(<Dropdown<TagItem> label="Tags" multiSelect options={OPTIONS} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /tags:/i }));
    expect(screen.getByRole('button', { name: 'Mountains' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocean' })).toBeInTheDocument();
  });

  it('single-select calls onChange with the chosen item and closes', () => {
    const onChange = jest.fn();
    render(
      <Dropdown<TagItem> label="Camera" multiSelect={false} options={OPTIONS} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /camera:/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ocean' }));
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1]);
    // List closed after select.
    expect(screen.queryByRole('button', { name: 'Mountains' })).not.toBeInTheDocument();
  });

  it('multi-select appends to the selected array and renders a removable chip', () => {
    const onChange = jest.fn();
    render(
      <Dropdown<TagItem>
        label="Tags"
        multiSelect
        options={OPTIONS}
        selectedValues={[OPTIONS[0]]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /tags:/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ocean' }));
    expect(onChange).toHaveBeenCalledWith([OPTIONS[0], OPTIONS[1]]);
    // The already-selected value shows a remove control (detailed variant default).
    expect(screen.getByRole('button', { name: 'Remove Mountains' })).toBeInTheDocument();
  });

  it('multi-select keeps the list open after a select (closes only on outside click)', () => {
    const onChange = jest.fn();
    render(<Dropdown<TagItem> label="Tags" multiSelect options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /tags:/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ocean' }));
    expect(onChange).toHaveBeenCalledWith([OPTIONS[1]]);
    // List stays open: both options remain in the DOM after the pick.
    expect(screen.getByRole('button', { name: 'Mountains' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocean' })).toBeInTheDocument();
  });

  it('inline add-new: opens the form, validates, and calls onAddNew with processed data', () => {
    const onAddNew = jest.fn();
    render(
      <Dropdown<TagItem>
        label="Tags"
        multiSelect
        options={[]}
        onChange={jest.fn()}
        allowAddNew
        onAddNew={onAddNew}
        addNewFields={[{ name: 'name', label: 'Tag Name', type: 'text', required: true }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /tags:/i }));
    fireEvent.click(screen.getByRole('button', { name: /add new tags/i }));
    const input = screen.getByLabelText('Tag Name');
    fireEvent.change(input, { target: { value: 'Sunsets' } });
    // Enter submits when valid.
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAddNew).toHaveBeenCalledWith({ name: 'Sunsets' });
  });

  it('inline add-new: Escape closes the form without calling onAddNew', () => {
    const onAddNew = jest.fn();
    render(
      <Dropdown<TagItem>
        label="Tags"
        multiSelect
        options={[]}
        onChange={jest.fn()}
        allowAddNew
        onAddNew={onAddNew}
        addNewFields={[{ name: 'name', label: 'Tag Name', type: 'text', required: true }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /tags:/i }));
    fireEvent.click(screen.getByRole('button', { name: /add new tags/i }));
    const input = screen.getByLabelText('Tag Name');
    fireEvent.change(input, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onAddNew).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Tag Name')).not.toBeInTheDocument();
  });

  it('closes the open list on outside click (Escape via document keydown)', () => {
    render(<Dropdown<TagItem> label="Tags" multiSelect options={OPTIONS} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /tags:/i }));
    expect(screen.getByRole('button', { name: 'Mountains' })).toBeInTheDocument();
    // useClickOutsideMultiple listens on document keydown for Escape.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Mountains' })).not.toBeInTheDocument();
  });

  it('opens via keyboard (Enter on the trigger)', () => {
    render(<Dropdown<TagItem> label="Tags" multiSelect options={OPTIONS} onChange={jest.fn()} />);
    const trigger = screen.getByRole('button', { name: /tags:/i });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Mountains' })).toBeInTheDocument();
  });

  it('simple variant renders click-to-remove chips without an explicit remove button', () => {
    render(
      <Dropdown<TagItem>
        label="People"
        multiSelect
        options={OPTIONS}
        selectedValues={[OPTIONS[0]]}
        onChange={jest.fn()}
        variant="simple"
      />
    );
    // The whole chip is the remove control; there is no separate "×" button child.
    const chip = screen.getByRole('button', { name: 'Remove Mountains' });
    expect(chip).toHaveTextContent('Mountains');
    expect(chip.querySelector('button')).toBeNull();
  });
});
