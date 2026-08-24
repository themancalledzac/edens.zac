import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { revalidateMetadataCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { MetadataList } from '@/app/components/ui/MetadataList/MetadataList';
import * as core from '@/app/lib/api/core';

jest.mock('@/app/lib/api/core');
jest.mock('@/app/components/ContentCollection/edit/collectionEditUtils', () => ({
  revalidateMetadataCache: jest.fn(() => Promise.resolve()),
}));

const mockPut = core.fetchAdminPutJsonApi as jest.MockedFunction<typeof core.fetchAdminPutJsonApi>;
const mockDelete = core.fetchAdminDeleteApi as jest.MockedFunction<typeof core.fetchAdminDeleteApi>;
const mockRevalidate = revalidateMetadataCache as jest.MockedFunction<
  typeof revalidateMetadataCache
>;

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
    // mockImplementation (not mockResolvedValue(undefined)) to satisfy both tsc — which requires
    // the resolved value — and eslint's unicorn/no-useless-undefined.
    mockDelete.mockImplementation(() => Promise.resolve());
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]!);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/metadata/tags/1'));
  });

  it('renders a go-to link when getHref is provided', () => {
    render(
      <MetadataList
        title="Locations"
        emptyLabel="No locations"
        items={items}
        basePath="/metadata/locations"
        getHref={item => `/location/${item.slug}`}
      />
    );
    const link = screen.getAllByRole('link')[0];
    expect(link).toHaveAttribute('href', '/location/forest');
  });

  it('revalidates the metadata caches after a successful rename', async () => {
    mockPut.mockResolvedValue({ id: 1, name: 'woods', slug: 'woods' });
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'woods' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(mockRevalidate).toHaveBeenCalledTimes(1));
  });

  it('revalidates the metadata caches after a successful delete', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockDelete.mockImplementation(() => Promise.resolve());
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]!);
    await waitFor(() => expect(mockRevalidate).toHaveBeenCalledTimes(1));
  });

  it('revalidates for every entity type, not just locations', async () => {
    mockPut.mockResolvedValue({ id: 1, name: 'Ada', slug: undefined });
    render(
      <MetadataList
        title="People"
        emptyLabel="No people"
        items={items}
        basePath="/metadata/people"
      />
    );

    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(mockRevalidate).toHaveBeenCalledTimes(1));
  });

  it('does not revalidate when the rename PUT resolves null', async () => {
    mockPut.mockResolvedValue(null);
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'woods' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(screen.getByText("Failed to update 'forest'")).toBeInTheDocument());
    expect(mockRevalidate).not.toHaveBeenCalled();
  });

  it('does not revalidate when the delete throws', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockDelete.mockRejectedValue(new Error('boom'));
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]!);
    await waitFor(() => expect(screen.getByText("Failed to delete 'forest'")).toBeInTheDocument());
    expect(mockRevalidate).not.toHaveBeenCalled();
  });
});
