import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MetadataList } from '@/app/components/ui/MetadataList/MetadataList';
import * as core from '@/app/lib/api/core';

jest.mock('@/app/lib/api/core');

const mockPut = core.fetchAdminPutJsonApi as jest.MockedFunction<typeof core.fetchAdminPutJsonApi>;
const mockDelete = core.fetchAdminDeleteApi as jest.MockedFunction<typeof core.fetchAdminDeleteApi>;

interface Item {
  id: number;
  name: string;
  slug?: string;
}

const items: Item[] = [
  { id: 1, name: 'forest', slug: 'forest' },
  { id: 2, name: 'river', slug: 'river' },
];

describe('MetadataList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the title, count, and one row per item', () => {
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('shows the empty label when there are no items', () => {
    render(<MetadataList title="Tags" emptyLabel="No tags" items={[]} basePath="/metadata/tags" />);
    expect(screen.getByText('No tags')).toBeInTheDocument();
  });

  it('PUTs the new name on Update and replaces the row', async () => {
    mockPut.mockResolvedValue({ id: 1, name: 'woods', slug: 'woods' });
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    const firstInput = screen.getAllByRole('textbox')[0]!;
    fireEvent.change(firstInput, { target: { value: 'woods' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith('/metadata/tags/1', { name: 'woods' })
    );
  });

  it('DELETEs after confirm and removes the row', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockDelete.mockResolvedValue(undefined);
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]!);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/metadata/tags/1'));
  });

  it('renders a go-to link when getHref is provided', () => {
    render(
      <MetadataList
        title="People"
        emptyLabel="No people"
        items={items}
        basePath="/metadata/people"
        getHref={item => `/people/${item.slug}`}
      />
    );
    const link = screen.getAllByRole('link')[0];
    expect(link).toHaveAttribute('href', '/people/forest');
  });
});
