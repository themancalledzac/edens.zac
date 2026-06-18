import { fireEvent, render, screen } from '@testing-library/react';

import type { ImageUpdateState } from '@/app/components/Metadata/hooks/useMetadataState';
import TagsPeopleSection from '@/app/components/Metadata/sections/TagsPeopleSection';
import type { ContentPersonModel, ContentTagModel } from '@/app/types/Metadata';

const baseUpdateState: ImageUpdateState = {
  id: 101,
  title: 'Test Image',
  blackAndWhite: false,
  isFilm: false,
  collections: [],
  tags: [],
  people: [],
  locations: [],
};

const availableTags: ContentTagModel[] = [
  { id: 1, name: 'landscape', slug: 'landscape' },
  { id: 2, name: 'portrait', slug: 'portrait' },
];

const availablePeople: ContentPersonModel[] = [
  { id: 10, name: 'Alice', slug: 'alice' },
  { id: 11, name: 'Bob', slug: 'bob' },
];

function makeProps(
  overrides: Partial<Parameters<typeof TagsPeopleSection>[0]> = {}
): Parameters<typeof TagsPeopleSection>[0] {
  return {
    updateState: baseUpdateState,
    updateStateField: jest.fn(),
    availableTags,
    availablePeople,
    ...overrides,
  };
}

describe('TagsPeopleSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Tags and People dropdowns', () => {
    render(<TagsPeopleSection {...makeProps()} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('Tags Dropdown emits updateStateField({ tags }) on change', () => {
    const updateStateField = jest.fn();
    render(<TagsPeopleSection {...makeProps({ updateStateField })} />);

    // Open the Tags dropdown via the trigger (div[role="button"])
    const tagsDropdownTrigger = screen.getByRole('button', {
      name: /tags:.*click to change/i,
    });
    fireEvent.click(tagsDropdownTrigger);

    // Click "landscape" option (now visible in the open dropdown)
    const landscapeOption = screen.getByRole('button', { name: 'landscape' });
    fireEvent.click(landscapeOption);

    expect(updateStateField).toHaveBeenCalledWith({
      tags: [availableTags[0]],
    });
  });

  it('People Dropdown emits updateStateField({ people }) on change', () => {
    const updateStateField = jest.fn();
    render(<TagsPeopleSection {...makeProps({ updateStateField })} />);

    // Open the People dropdown via the trigger (div[role="button"])
    const peopleDropdownTrigger = screen.getByRole('button', {
      name: /people:.*click to change/i,
    });
    fireEvent.click(peopleDropdownTrigger);

    // Click "Alice" option (now visible in the open dropdown)
    const aliceOption = screen.getByRole('button', { name: 'Alice' });
    fireEvent.click(aliceOption);

    expect(updateStateField).toHaveBeenCalledWith({
      people: [availablePeople[0]],
    });
  });

  it('renders the People options alphabetically (case-insensitive) regardless of input order', () => {
    const unsortedPeople: ContentPersonModel[] = [
      { id: 1, name: 'Zara', slug: 'zara' },
      { id: 2, name: 'adam', slug: 'adam' },
      { id: 3, name: 'Mia', slug: 'mia' },
    ];
    render(<TagsPeopleSection {...makeProps({ availablePeople: unsortedPeople })} />);

    const peopleTrigger = screen.getByRole('button', { name: /people:.*click to change/i });
    fireEvent.click(peopleTrigger);

    const names = unsortedPeople.map(p => p.name);
    const optionOrder = screen
      .getAllByRole('button')
      .map(b => b.textContent?.trim() ?? '')
      .filter(text => names.includes(text));

    expect(optionOrder).toEqual(['adam', 'Mia', 'Zara']);
  });

  it('onAddNew for Tags appends to the current tags list', () => {
    const updateStateField = jest.fn();
    const existingTag: ContentTagModel = { id: 5, name: 'existing', slug: 'existing' };
    render(
      <TagsPeopleSection
        {...makeProps({
          updateStateField,
          updateState: { ...baseUpdateState, tags: [existingTag] },
        })}
      />
    );

    // Open Tags dropdown then click "Add new tags" (+) button
    const tagsDropdownTrigger = screen.getByRole('button', {
      name: /tags:.*click to change/i,
    });
    fireEvent.click(tagsDropdownTrigger);

    const addNewButton = screen.getByRole('button', { name: /add new tags/i });
    fireEvent.click(addNewButton);

    const tagNameInput = screen.getByPlaceholderText(/enter new tag/i);
    fireEvent.change(tagNameInput, { target: { value: 'mountains' } });

    const submitButton = screen.getByRole('button', { name: /^add tags$/i });
    fireEvent.click(submitButton);

    expect(updateStateField).toHaveBeenCalledWith({
      tags: [existingTag, { id: 0, name: 'mountains', slug: '' }],
    });
  });

  it('onAddNew for People appends to the current people list', () => {
    const updateStateField = jest.fn();
    const existingPerson: ContentPersonModel = { id: 20, name: 'Charlie', slug: 'charlie' };
    render(
      <TagsPeopleSection
        {...makeProps({
          updateStateField,
          updateState: { ...baseUpdateState, people: [existingPerson] },
        })}
      />
    );

    // Open People dropdown then click "Add new people" (+) button
    const peopleDropdownTrigger = screen.getByRole('button', {
      name: /people:.*click to change/i,
    });
    fireEvent.click(peopleDropdownTrigger);

    const addNewButton = screen.getByRole('button', { name: /add new people/i });
    fireEvent.click(addNewButton);

    const personNameInput = screen.getByPlaceholderText(/enter person name/i);
    fireEvent.change(personNameInput, { target: { value: 'Diana' } });

    const submitButton = screen.getByRole('button', { name: /^add people$/i });
    fireEvent.click(submitButton);

    expect(updateStateField).toHaveBeenCalledWith({
      people: [existingPerson, { id: 0, name: 'Diana', slug: '' }],
    });
  });
});
