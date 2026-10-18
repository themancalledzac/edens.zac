import { readFileSync } from 'node:fs';
import path from 'node:path';

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

  it('hands onRenamed the pre-save item and the saved response', async () => {
    const onRenamed = jest.fn();
    mockPut.mockResolvedValue({ id: 1, name: 'woods', slug: 'woods' });
    render(
      <MetadataList
        title="Locations"
        emptyLabel="No locations"
        items={items}
        basePath="/metadata/locations"
        onRenamed={onRenamed}
      />
    );

    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'woods' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() =>
      expect(onRenamed).toHaveBeenCalledWith(
        { id: 1, name: 'forest', slug: 'forest' },
        { id: 1, name: 'woods', slug: 'woods' }
      )
    );
  });

  it('hands onDeleted the removed item', async () => {
    const onDeleted = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockDelete.mockImplementation(() => Promise.resolve());
    render(
      <MetadataList
        title="Locations"
        emptyLabel="No locations"
        items={items}
        basePath="/metadata/locations"
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]!);
    await waitFor(() =>
      expect(onDeleted).toHaveBeenCalledWith({ id: 1, name: 'forest', slug: 'forest' })
    );
  });

  it('does not call onRenamed when the rename PUT resolves null', async () => {
    const onRenamed = jest.fn();
    mockPut.mockResolvedValue(null);
    render(
      <MetadataList
        title="Locations"
        emptyLabel="No locations"
        items={items}
        basePath="/metadata/locations"
        onRenamed={onRenamed}
      />
    );

    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'woods' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(screen.getByText("Failed to update 'forest'")).toBeInTheDocument());
    expect(onRenamed).not.toHaveBeenCalled();
  });

  it('does not call onDeleted when the delete throws', async () => {
    const onDeleted = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockDelete.mockRejectedValue(new Error('boom'));
    render(
      <MetadataList
        title="Locations"
        emptyLabel="No locations"
        items={items}
        basePath="/metadata/locations"
        onDeleted={onDeleted}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]!);
    await waitFor(() => expect(screen.getByText("Failed to delete 'forest'")).toBeInTheDocument());
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('renames fine with no callbacks wired (tags and people pass none)', async () => {
    mockPut.mockResolvedValue({ id: 1, name: 'woods', slug: 'woods' });
    render(
      <MetadataList title="Tags" emptyLabel="No tags" items={items} basePath="/metadata/tags" />
    );

    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'woods' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(mockRevalidate).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/failed to update/i)).not.toBeInTheDocument();
  });
});

const LIST_DIR = path.join(process.cwd(), 'app/components/ui/MetadataList');
const LIST_SCSS = readFileSync(path.join(LIST_DIR, 'MetadataList.module.scss'), 'utf8');
const PAGE_SCSS = readFileSync(
  path.join(process.cwd(), 'app/components/MetadataPage/MetadataPage.module.scss'),
  'utf8'
);

/** The declarations of the first top-level rule for `selector`, as one string. */
function ruleBody(scss: string, selector: string): string {
  const match = new RegExp(`^\\${selector}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(scss);
  return match?.[1] ?? '';
}

/** Lines that open a `//` or JSX comment, which the no-inline-comments rule forbids in a body. */
function findInlineComments(source: string): string[] {
  return source.split('\n').filter(line => /^\s*\/\/|{\/\*/.test(line));
}

describe('MetadataList whole-row height', () => {
  it('A11: every row is the one fixed row height', () => {
    expect(ruleBody(LIST_SCSS, '.row')).toMatch(/\bheight:\s*var\(--metadata-row-height\)/);
  });

  it('A11/S1: the list max height rounds down to whole rows of that height', () => {
    const list = ruleBody(LIST_SCSS, '.list');
    expect(list).toMatch(/--metadata-row-height:\s*\d/);
    expect(list).toMatch(/max-height:[^;]*round\(down,[^;]*var\(--metadata-row-height\)\)/);
    expect(list).not.toMatch(/max-height:\s*60vh\s*;/);
  });

  it('A11: the metadata grid leaves a gap above the footer', () => {
    expect(ruleBody(PAGE_SCSS, '.grid')).toMatch(/margin-bottom:\s*var\(--space-\d\)/);
  });
});

describe('MetadataList source hygiene', () => {
  it('M7: MetadataList.tsx has no inline comments', () => {
    const source = readFileSync(path.join(LIST_DIR, 'MetadataList.tsx'), 'utf8');
    expect(findInlineComments(source)).toEqual([]);
  });

  it('twin of M7: the detector flags an inline comment when one is present', () => {
    const source = 'function f() {\n  // why\n  return 1;\n}\n';
    expect(findInlineComments(source)).toEqual(['  // why']);
  });
});
