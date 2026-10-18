/**
 * Tests for CollectionsPanel — the hub's collection list and its detail sheet.
 *
 * Mocks the collections API (`getMetadata` for the list, `getCollectionUpdateMetadata` for the
 * sheet's read of the current visibility, `updateCollection` for the save). `next/navigation` is
 * mocked for `useRouter`.
 *
 * The panel data cache is module-level and survives between tests in a file, so every case clears
 * it first — otherwise the second test paints the first one's list without ever calling the mock.
 *
 * Guards the build must expose, patched by the twin tests:
 * - `collectionsPanelGuards.saveVisibility(id, visibility)` in CollectionsPanel.tsx, which performs
 *   the save by calling `updateCollection(id, { visibility })`.
 * - `collectionsPanelGuards.rollsBackFailedSave()` in CollectionsPanel.tsx, which returns true when
 *   a failed save puts the select back on the last saved visibility.
 */

import type * as childProcessModule from 'node:child_process';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import ts from 'typescript';

import * as collectionsPanelModule from '@/app/components/CollectionsPanel/CollectionsPanel';
import CollectionsPanel from '@/app/components/CollectionsPanel/CollectionsPanel';
import { AdminPanelSeedProvider } from '@/app/components/ListPanel/AdminPanelSeedContext';
import * as listPanelModule from '@/app/components/ListPanel/ListPanel';
import * as panelBodyModule from '@/app/components/ListPanel/PanelBody';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import * as collectionsApi from '@/app/lib/api/collections';
import {
  type CollectionListModel,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import {
  COLLECTION_VISIBILITY_LABELS,
  CollectionVisibility,
} from '@/app/types/CollectionVisibility';
import { manageHref } from '@/app/utils/manageUrl';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@/app/lib/api/collections', () => ({
  getMetadata: jest.fn(),
  getCollectionUpdateMetadata: jest.fn(),
  updateCollection: jest.fn(),
}));

jest.mock('@/app/components/ListPanel/PanelBody', () => {
  const actual = jest.requireActual<typeof panelBodyModule>('@/app/components/ListPanel/PanelBody');
  return { ...actual, PanelBody: jest.fn(actual.PanelBody) };
});

jest.mock('@/app/components/ListPanel/ListPanel', () => {
  const actual = jest.requireActual<typeof listPanelModule>('@/app/components/ListPanel/ListPanel');
  return { ...actual, ListRows: jest.fn(actual.ListRows) };
});

jest.mock('node:child_process', () => {
  const actual = jest.requireActual<typeof childProcessModule>('node:child_process');
  return { ...actual, execFileSync: jest.fn(actual.execFileSync) };
});

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetMetadata = collectionsApi.getMetadata as jest.MockedFunction<
  typeof collectionsApi.getMetadata
>;
const mockGetUpdateMetadata = collectionsApi.getCollectionUpdateMetadata as jest.MockedFunction<
  typeof collectionsApi.getCollectionUpdateMetadata
>;
const mockUpdate = collectionsApi.updateCollection as jest.MockedFunction<
  typeof collectionsApi.updateCollection
>;

/**
 * Deliberately in the wrong order, and deliberately mixed: 'Bare' has neither a date nor a cover,
 * which is the shape every row has until the backend list projection deploys. 'Aspen' is dated
 * but older than 'Dolomites', so alphabetical order and date order disagree — a panel that sorted
 * by name would put Aspen first and pass a weaker fixture.
 */
const COLLECTIONS: CollectionListModel[] = [
  { id: 2, name: 'Bare', slug: 'bare' },
  { id: 3, name: 'Aspen', slug: 'aspen', collectionDate: '2026-01-15' },
  {
    id: 1,
    name: 'Dolomites',
    slug: 'dolomites',
    collectionDate: '2026-06-01',
    coverImageUrl: 'https://d123.cloudfront.net/dolomites.jpg',
  },
];

const metadataWith = (collections: CollectionListModel[]): GeneralMetadataDTO => ({
  tags: [],
  people: [],
  locations: [],
  cameras: [],
  lenses: [],
  filmTypes: [],
  filmFormats: [],
  collections,
});

const updateResponse = (visibility: CollectionVisibility): CollectionUpdateResponseDTO =>
  ({
    collection: { id: 1, slug: 'dolomites', name: 'Dolomites', visibility },
  }) as unknown as CollectionUpdateResponseDTO;

const rowNames = () => screen.getAllByRole('listitem').map(row => row.textContent?.split(' · ')[0]);

const rowFor = async (name: string) => (await screen.findByText(name)).closest('li') as HTMLElement;

const openSheet = async (name = 'Dolomites') => {
  const row = await rowFor(name);
  fireEvent.click(within(row).getByRole('button'));
  return screen.findByRole('dialog');
};

const openSheetWithSelect = async () => {
  const dialog = await openSheet();
  const select = within(dialog).getByRole('combobox') as HTMLSelectElement;
  await waitFor(() => expect(select.value).toBe(CollectionVisibility.UNLISTED));
  return select;
};

describe('CollectionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCachedPanelData();
    window.localStorage.clear();
    mockGetMetadata.mockResolvedValue(metadataWith(COLLECTIONS));
    mockGetUpdateMetadata.mockResolvedValue(updateResponse(CollectionVisibility.UNLISTED));
    mockUpdate.mockResolvedValue(updateResponse(CollectionVisibility.HIDDEN));
    jest
      .mocked(listPanelModule.ListRows)
      .mockImplementation(
        jest.requireActual<typeof listPanelModule>('@/app/components/ListPanel/ListPanel').ListRows
      );
  });

  it('sorts newest first, with undated collections last', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    expect(rowNames()).toEqual(['Dolomites', 'Aspen', 'Bare']);
  });

  it('renders each date in long form, and nothing at all for an undated collection', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    expect(screen.getByText('June 1st, 2026')).toBeInTheDocument();
    expect(screen.getByText('January 15th, 2026')).toBeInTheDocument();
    expect(screen.queryByText('2026-06-01')).not.toBeInTheDocument();
  });

  it('links the header to the full collections page, showing the count', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    const viewAll = screen.getByRole('link', { name: /View all/ });
    expect(viewAll).toHaveAttribute('href', '/collections');
    expect(viewAll).toHaveTextContent('3 · View all');
  });

  it('paints the server seed synchronously and revalidates behind it', async () => {
    mockGetMetadata.mockResolvedValue(
      metadataWith([...COLLECTIONS, { id: 4, name: 'Zion', slug: 'zion', collectionDate: null }])
    );
    render(
      <AdminPanelSeedProvider value={{ collections: COLLECTIONS }}>
        <CollectionsPanel />
      </AdminPanelSeedProvider>
    );

    expect(screen.getByText('Dolomites')).toBeInTheDocument();
    expect(screen.queryByText('Loading collections…')).not.toBeInTheDocument();
    expect(screen.queryByText('Zion')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Zion')).toBeInTheDocument());
    expect(mockGetMetadata).toHaveBeenCalledTimes(1);
  });

  it('says the list is cached when a background refresh fails', async () => {
    const warm = render(<CollectionsPanel />);
    await screen.findByText('Dolomites');
    warm.unmount();

    mockGetMetadata.mockRejectedValueOnce(new Error('backend down'));
    render(<CollectionsPanel />);

    await waitFor(() => expect(screen.getByText(/showing cached data/i)).toBeInTheDocument());
    expect(screen.getByText('Dolomites')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no collections', async () => {
    mockGetMetadata.mockResolvedValue(metadataWith([]));
    render(<CollectionsPanel />);

    expect(await screen.findByText('No collections yet.')).toBeInTheDocument();
  });

  it('announces the in-flight read through one region that outlives the load', async () => {
    let resolveMetadata!: (metadata: GeneralMetadataDTO) => void;
    mockGetMetadata.mockImplementation(
      () =>
        new Promise<GeneralMetadataDTO>(resolve => {
          resolveMetadata = resolve;
        })
    );

    render(<CollectionsPanel />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading collections…');
    expect(status).toHaveAttribute('aria-live', 'polite');

    resolveMetadata(metadataWith([]));
    await waitFor(() => expect(screen.getByText('No collections yet.')).toBeInTheDocument());

    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });

  it('reports a failed load rather than an empty list', async () => {
    mockGetMetadata.mockRejectedValue(new Error('backend down'));
    render(<CollectionsPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('No collections yet.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('retries the read from the failure branch and renders the list on success', async () => {
    mockGetMetadata.mockRejectedValueOnce(new Error('backend down'));
    render(<CollectionsPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mockGetMetadata).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Dolomites')).toBeInTheDocument());
    expect(mockGetMetadata).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('A4: a collection row is one line: a 20px thumb, the name, and a muted date after a middle dot', async () => {
    render(<CollectionsPanel />);
    const row = await rowFor('Dolomites');

    expect(row).toHaveTextContent('Dolomites · June 1st, 2026');
    const thumb = row.querySelector('img') as HTMLImageElement;
    expect(thumb).not.toBeNull();
    expect(thumb).toHaveAttribute('width', '20');
    expect(thumb).toHaveAttribute('height', '20');
    expect(
      within(row).getByText('June 1st, 2026').closest('span[class*="rowSecondary"]')
    ).not.toBeNull();
    expect(row.querySelector('[class*="rowFact"]')).toBeNull();
  });

  it('A4: a row with no cover keeps a placeholder instead of an image', async () => {
    const { container } = render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    expect(container.querySelectorAll('li img')).toHaveLength(1);
  });

  it('A4: the row itself is the only clickable element', async () => {
    render(<CollectionsPanel />);
    const row = await rowFor('Dolomites');

    expect(within(row).getAllByRole('button')).toHaveLength(1);
    expect(within(row).queryAllByRole('link')).toHaveLength(0);
    expect(within(row).queryAllByRole('combobox')).toHaveLength(0);
  });

  it('A5: tapping a row opens a sheet with cover, title, date, Open, Manage and the visibility select', async () => {
    render(<CollectionsPanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const dialog = await openSheet();

    expect(within(dialog).getByRole('heading', { name: 'Dolomites' })).toBeInTheDocument();
    expect(within(dialog).getByText('June 1st, 2026')).toBeInTheDocument();
    expect(dialog.querySelector('img')).not.toBeNull();
    expect(within(dialog).getByRole('link', { name: /open/i })).toHaveAttribute(
      'href',
      '/dolomites'
    );
    expect(within(dialog).getByRole('link', { name: /manage/i })).toHaveAttribute(
      'href',
      manageHref('dolomites')
    );
    expect(within(dialog).getByRole('combobox')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('A5: the select offers all three visibilities under COLLECTION_VISIBILITY_LABELS', async () => {
    render(<CollectionsPanel />);
    const dialog = await openSheet();
    const select = within(dialog).getByRole('combobox');

    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map(option => option.value).sort()).toEqual(
      Object.values(CollectionVisibility).sort()
    );
    for (const visibility of Object.values(CollectionVisibility)) {
      expect(
        within(select).getByRole('option', { name: COLLECTION_VISIBILITY_LABELS[visibility] })
      ).toHaveValue(visibility);
    }
  });

  it('A5: the sheet reads the current visibility on open with getCollectionUpdateMetadata', async () => {
    render(<CollectionsPanel />);
    expect(mockGetUpdateMetadata).not.toHaveBeenCalled();

    const select = await openSheetWithSelect();

    expect(mockGetUpdateMetadata).toHaveBeenCalledWith('dolomites');
    expect(select.value).toBe(CollectionVisibility.UNLISTED);
  });

  it('A5: the sheet closes from its close button', async () => {
    render(<CollectionsPanel />);
    await openSheet();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('A8: the loading, error, empty and stale states render through PanelBody', async () => {
    const spy = jest.mocked(panelBodyModule.PanelBody);
    spy.mockClear();
    mockGetMetadata.mockResolvedValue(metadataWith([]));
    render(<CollectionsPanel />);
    await screen.findByText('No collections yet.');

    expect(spy.mock.calls.some(([props]) => props.loading)).toBe(true);
    expect(spy.mock.calls.some(([props]) => props.isEmpty && !props.loading)).toBe(true);
  });

  it('A8: a load failure reaches PanelBody as loadError', async () => {
    const spy = jest.mocked(panelBodyModule.PanelBody);
    spy.mockClear();
    mockGetMetadata.mockRejectedValue(new Error('backend down'));
    render(<CollectionsPanel />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    expect(spy.mock.calls.some(([props]) => props.loadError !== null && !props.loading)).toBe(true);
  });

  it('A8: a failed background refresh reaches PanelBody as revalidationFailed', async () => {
    const warm = render(<CollectionsPanel />);
    await screen.findByText('Dolomites');
    warm.unmount();

    const spy = jest.mocked(panelBodyModule.PanelBody);
    spy.mockClear();
    mockGetMetadata.mockRejectedValueOnce(new Error('backend down'));
    render(<CollectionsPanel />);
    await waitFor(() => expect(screen.getByText(/showing cached data/i)).toBeInTheDocument());

    expect(spy.mock.calls.some(([props]) => props.revalidationFailed)).toBe(true);
  });

  it('M2: changing the select saves at once with updateCollection(id, { visibility })', async () => {
    render(<CollectionsPanel />);
    const select = await openSheetWithSelect();

    fireEvent.change(select, { target: { value: CollectionVisibility.HIDDEN } });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ visibility: CollectionVisibility.HIDDEN })
    );
    expect(select.value).toBe(CollectionVisibility.HIDDEN);
  });

  it('M2 twin: with the save guard letting everything through, updateCollection is never called', async () => {
    const saveSpy = jest
      .spyOn(collectionsPanelModule.collectionsPanelGuards, 'saveVisibility')
      .mockImplementation(() => Promise.resolve());
    try {
      render(<CollectionsPanel />);
      const select = await openSheetWithSelect();

      fireEvent.change(select, { target: { value: CollectionVisibility.HIDDEN } });
      await waitFor(() => expect(select.value).toBe(CollectionVisibility.HIDDEN));

      expect(mockUpdate).not.toHaveBeenCalled();
    } finally {
      saveSpy.mockRestore();
    }
  });

  it('S1: the save carries the collection id and the chosen CollectionVisibility', async () => {
    render(<CollectionsPanel />);
    const dialog = await openSheet('Aspen');
    const select = within(dialog).getByRole('combobox') as HTMLSelectElement;
    await waitFor(() => expect(mockGetUpdateMetadata).toHaveBeenCalledWith('aspen'));

    fireEvent.change(select, { target: { value: CollectionVisibility.LISTED } });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0]?.[0]).toBe(3);
    expect(mockUpdate.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ visibility: CollectionVisibility.LISTED })
    );
  });

  it('S1: a failed save puts the select back on the last saved visibility', async () => {
    mockUpdate.mockRejectedValue(new Error('save failed'));
    render(<CollectionsPanel />);
    const select = await openSheetWithSelect();

    fireEvent.change(select, { target: { value: CollectionVisibility.HIDDEN } });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(select.value).toBe(CollectionVisibility.UNLISTED));
  });

  it('S1 twin: with the rollback guard off, a failed save leaves the select showing the new value', async () => {
    const rollbackSpy = jest
      .spyOn(collectionsPanelModule.collectionsPanelGuards, 'rollsBackFailedSave')
      .mockReturnValue(false);
    try {
      mockUpdate.mockRejectedValue(new Error('save failed'));
      render(<CollectionsPanel />);
      const select = await openSheetWithSelect();

      fireEvent.change(select, { target: { value: CollectionVisibility.HIDDEN } });

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(select.value).toBe(CollectionVisibility.HIDDEN));
    } finally {
      rollbackSpy.mockRestore();
    }
  });

  it('M4: collections render as a list of rows, not a tile grid', async () => {
    const { container } = render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    const list = screen.getAllByRole('list')[0] as HTMLElement;
    expect(list.tagName).toBe('UL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(container.querySelector('[class*="grid" i]')).toBeNull();
    expect(container.querySelector('[class*="tile" i]')).toBeNull();
  });

  it('M4 twin: with the list surface replaced by a tile wrapper the list check fails', async () => {
    jest
      .mocked(listPanelModule.ListRows)
      .mockImplementation(({ children }: { children: ReactNode }) => (
        <div className="tileGrid">{children}</div>
      ));
    const { container } = render(<CollectionsPanel />);
    await waitFor(() => expect(container.querySelector('.tileGrid')).not.toBeNull());

    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('[class*="grid" i]')).not.toBeNull();
  });

  const inlineComments = (files: string[]) => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isBlock(node) && node.parent && ts.isFunctionLike(node.parent)) {
          const text = source.slice(node.getStart(), node.getEnd());
          const scanner = ts.createScanner(
            ts.ScriptTarget.Latest,
            false,
            ts.LanguageVariant.Standard,
            text
          );
          for (let t = scanner.scan(); t !== ts.SyntaxKind.EndOfFileToken; t = scanner.scan()) {
            if (
              t === ts.SyntaxKind.SingleLineCommentTrivia ||
              t === ts.SyntaxKind.MultiLineCommentTrivia
            ) {
              offenders.push(scanner.getTokenText());
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    return offenders;
  };

  const sourceFiles = () => {
    const dir = join(process.cwd(), 'app/components/CollectionsPanel');
    return fs
      .readdirSync(dir)
      .filter(name => /\.tsx?$/.test(name))
      .map(name => join(dir, name));
  };

  it('M7: no inline comments inside function bodies of the panel source', () => {
    expect(inlineComments(sourceFiles())).toEqual([]);
  });

  it('M7 twin: with the source reader returning a body comment the scan reports it', () => {
    const real = fs.readFileSync;
    jest.spyOn(fs, 'readFileSync').mockImplementation(((file: string, options: never) => {
      const text = String(real(file, options));
      return `${text}\nfunction injected() {\n  // a comment\n  return 1;\n}\n`;
    }) as typeof fs.readFileSync);

    const offenders = inlineComments(sourceFiles());
    jest.restoreAllMocks();

    expect(offenders).toContain('// a comment');
  });

  const ALLOWED = [
    /^app\/components\/CollectionsPanel\//,
    /^tests\/components\/CollectionsPanel\//,
  ];

  const strayChanges = () => {
    const out = execFileSync('git', ['status', '--porcelain', '--', 'app', 'tests'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .filter(Boolean)
      .map(line => line.slice(3).trim())
      .filter(path => !ALLOWED.some(allowed => allowed.test(path)));
  };

  it('M8: the working tree touches nothing under app or tests outside the step paths', () => {
    expect(strayChanges()).toEqual([]);
  });

  it('M8 twin: with git reporting an extra changed file the stray-change check fails', () => {
    jest
      .mocked(execFileSync)
      .mockReturnValue(' M app/lib/api/collections.ts\n M app/components/CollectionsPanel/x.tsx\n');

    expect(strayChanges()).toEqual(['app/lib/api/collections.ts']);
  });
});
