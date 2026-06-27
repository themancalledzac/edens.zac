import { fireEvent, render, screen } from '@testing-library/react';

import TagsSelector from '@/app/components/ui/TagsSelector/TagsSelector';
import type { ContentTagModel } from '@/app/types/Metadata';

const availableTags: ContentTagModel[] = [
  { id: 1, name: 'landscape', slug: 'landscape' },
  { id: 2, name: 'portrait', slug: 'portrait' },
];

function openDropdown(): void {
  const trigger = screen.getByRole('button', { name: /tags:.*click to change/i });
  fireEvent.click(trigger);
}

describe('TagsSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Tags dropdown', () => {
    render(<TagsSelector selectedTags={[]} availableTags={availableTags} onChange={jest.fn()} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('emits onChange with the selected tag when an option is clicked', () => {
    const onChange = jest.fn();
    render(<TagsSelector selectedTags={[]} availableTags={availableTags} onChange={onChange} />);

    openDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'landscape' }));

    expect(onChange).toHaveBeenCalledWith([availableTags[0]]);
  });

  it('emits onChange without a tag when a selected tag is removed via its chip', () => {
    const onChange = jest.fn();
    render(
      <TagsSelector
        selectedTags={[availableTags[0]!]}
        availableTags={availableTags}
        onChange={onChange}
      />
    );

    // The selected tag renders as a chip with a "Remove <name>" button.
    fireEvent.click(screen.getByRole('button', { name: /remove landscape/i }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('renders the option list alphabetically (case-insensitive) regardless of input order', () => {
    const unsorted: ContentTagModel[] = [
      { id: 1, name: 'Zebra', slug: 'zebra' },
      { id: 2, name: 'apple', slug: 'apple' },
      { id: 3, name: 'Mango', slug: 'mango' },
    ];
    render(<TagsSelector selectedTags={[]} availableTags={unsorted} onChange={jest.fn()} />);
    openDropdown();

    const names = unsorted.map(t => t.name);
    const optionOrder = screen
      .getAllByRole('button')
      .map(b => b.textContent?.trim() ?? '')
      .filter(text => names.includes(text));

    expect(optionOrder).toEqual(['apple', 'Mango', 'Zebra']);
  });

  it('onAddNew appends an id: 0 tag and calls onChange with the new list', () => {
    const onChange = jest.fn();
    const existingTag: ContentTagModel = { id: 5, name: 'existing', slug: 'existing' };
    render(
      <TagsSelector
        selectedTags={[existingTag]}
        availableTags={availableTags}
        onChange={onChange}
      />
    );

    openDropdown();
    fireEvent.click(screen.getByRole('button', { name: /add new tags/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter new tag/i), {
      target: { value: 'mountains' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add tags$/i }));

    expect(onChange).toHaveBeenCalledWith([existingTag, { id: 0, name: 'mountains', slug: '' }]);
  });
});
