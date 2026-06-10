import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentTextModel,
} from '@/app/types/Content';
import { type FilterState, INITIAL_FILTER_STATE, type LensType } from '@/app/types/GalleryFilter';
import {
  applyActiveOverride,
  applyCollectionFilters,
  buildCollectionCriteria,
  buildLocationCriteria,
  canFilter,
  computeFilterCounts,
  computeFilterVisibility,
  type ContentFilterCriteria,
  extractCollectionFilterOptions,
  extractFilterOptions,
  filmFilterFromIsFilm,
  filterContent,
  hasAnyActiveFilter,
  hasFilterableOptions,
  mergeDateSortedImages,
  parseFilterFromParams,
  serializeFilterToParams,
} from '@/app/utils/contentFilter';

// ─── Test Fixtures ───

function makeImage(overrides: Partial<ContentImageModel> = {}): ContentImageModel {
  return {
    id: 1,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: 'https://example.com/test.jpg',
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
    ...overrides,
  };
}

function makeTextBlock(): ContentTextModel {
  return {
    id: 100,
    contentType: 'TEXT',
    orderIndex: 0,
    items: [{ type: 'text', value: 'Hello' }],
    format: 'plain',
    align: 'left',
  };
}

const sampleImages: ContentImageModel[] = [
  makeImage({
    id: 1,
    title: 'Seattle Sunset',
    rating: 5,
    locations: [{ id: 1, name: 'Seattle', slug: 'seattle' }],
    camera: { id: 1, name: 'Sony A7III' },
    tags: [
      { id: 1, name: 'landscape', slug: 'landscape' },
      { id: 2, name: 'sunset', slug: 'sunset' },
    ],
    people: [{ id: 1, name: 'Alice', slug: 'alice' }],
    captureDate: '2024-06-15T18:30:00Z',
  }),
  makeImage({
    id: 2,
    title: 'Portland Bridge',
    rating: 3,
    locations: [{ id: 2, name: 'Portland', slug: 'portland' }],
    camera: { id: 2, name: 'Nikon Z6' },
    tags: [{ id: 3, name: 'architecture', slug: 'architecture' }],
    people: [],
    captureDate: '2024-03-10T12:00:00Z',
  }),
  makeImage({
    id: 3,
    title: 'Tokyo Street',
    rating: 4,
    locations: [{ id: 3, name: 'Tokyo', slug: 'tokyo' }],
    camera: { id: 1, name: 'Sony A7III' },
    tags: [
      { id: 4, name: 'street', slug: 'street' },
      { id: 1, name: 'landscape', slug: 'landscape' },
    ],
    people: [{ id: 2, name: 'Bob', slug: 'bob' }],
    captureDate: '2024-09-01T08:00:00Z',
  }),
];

// ─── filterContent ───

describe('filterContent', () => {
  it('returns all content when no filters are active', () => {
    const result = filterContent(sampleImages, {});
    expect(result).toHaveLength(3);
  });

  it('filters by minRating', () => {
    const result = filterContent(sampleImages, { minRating: 4 });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual([1, 3]);
  });

  it('filters by people (OR logic)', () => {
    const result = filterContent(sampleImages, { people: ['Alice'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
  });

  it('filters by multiple people (OR logic)', () => {
    const result = filterContent(sampleImages, { people: ['Alice', 'Bob'] });
    expect(result).toHaveLength(2);
  });

  it('filters by location', () => {
    const result = filterContent(sampleImages, { locations: ['Tokyo'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(3);
  });

  it('filters by tags', () => {
    const result = filterContent(sampleImages, { tags: ['landscape'] });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual([1, 3]);
  });

  it('filters by camera', () => {
    const result = filterContent(sampleImages, { cameras: ['Nikon Z6'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(2);
  });

  it('filters by free-text query matching title', () => {
    const result = filterContent(sampleImages, { query: 'sunset' });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
  });

  it('filters by free-text query matching tag name', () => {
    const result = filterContent(sampleImages, { query: 'architecture' });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(2);
  });

  it('filters by free-text query matching person name', () => {
    const result = filterContent(sampleImages, { query: 'bob' });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(3);
  });

  it('filters by date range', () => {
    const result = filterContent(sampleImages, {
      dateFrom: '2024-05-01',
      dateTo: '2024-07-01',
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
  });

  it('combines multiple filter types with AND logic', () => {
    const result = filterContent(sampleImages, {
      minRating: 4,
      tags: ['landscape'],
    });
    expect(result).toHaveLength(2); // Both rating 5 and 4 have 'landscape'
  });

  it('excludes non-image content when filters are active', () => {
    const mixed: AnyContentModel[] = [...sampleImages, makeTextBlock()];
    const result = filterContent(mixed, { minRating: 1 });
    // Text block should be excluded
    expect(result.every(r => r.contentType === 'IMAGE')).toBe(true);
  });

  it('includes non-image content when no filters are active', () => {
    const mixed: AnyContentModel[] = [...sampleImages, makeTextBlock()];
    const result = filterContent(mixed, {});
    expect(result).toHaveLength(4);
  });

  it('handles case-insensitive matching for people', () => {
    const result = filterContent(sampleImages, { people: ['alice'] });
    expect(result).toHaveLength(1);
  });

  it('handles case-insensitive matching for query', () => {
    const result = filterContent(sampleImages, { query: 'TOKYO' });
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no images match', () => {
    const result = filterContent(sampleImages, { minRating: 5, locations: ['Portland'] });
    expect(result).toHaveLength(0);
  });

  // ── New filter dimensions ──

  describe('isFilm filter', () => {
    const filmImages = [
      makeImage({ id: 10, isFilm: true, title: 'Film Shot' }),
      makeImage({ id: 11, isFilm: false, title: 'Digital Shot' }),
      makeImage({ id: 12, isFilm: true, title: 'Another Film' }),
    ];

    it('filters to film-only images', () => {
      const result = filterContent(filmImages, { isFilm: true });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual([10, 12]);
    });

    it('filters to digital-only images', () => {
      const result = filterContent(filmImages, { isFilm: false });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(11);
    });

    it('treats undefined isFilm as digital (false) when filtering for digital', () => {
      const images = [
        makeImage({ id: 1, isFilm: undefined }),
        makeImage({ id: 2, isFilm: false }),
        makeImage({ id: 3, isFilm: true }),
      ];
      const result = filterContent(images, { isFilm: false });
      expect(result.map(r => r.id)).toEqual([1, 2]);
    });
  });

  describe('blackAndWhite filter', () => {
    const bwImages = [
      makeImage({ id: 20, blackAndWhite: true, title: 'BW Photo' }),
      makeImage({ id: 21, blackAndWhite: false, title: 'Color Photo' }),
      makeImage({ id: 22, blackAndWhite: true, title: 'Another BW' }),
    ];

    it('filters to black & white only', () => {
      const result = filterContent(bwImages, { blackAndWhite: true });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual([20, 22]);
    });

    it('filters to color only', () => {
      const result = filterContent(bwImages, { blackAndWhite: false });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(21);
    });

    it('treats undefined blackAndWhite as color (false) when filtering for color', () => {
      const images = [
        makeImage({ id: 1, blackAndWhite: undefined }),
        makeImage({ id: 2, blackAndWhite: false }),
        makeImage({ id: 3, blackAndWhite: true }),
      ];
      const result = filterContent(images, { blackAndWhite: false });
      expect(result.map(r => r.id)).toEqual([1, 2]);
    });
  });

  describe('collectionIds filter', () => {
    const collectionImages = [
      makeImage({
        id: 30,
        title: 'In collection A',
        collections: [{ collectionId: 100, name: 'Trip A', visible: true, orderIndex: 0 }],
      }),
      makeImage({
        id: 31,
        title: 'In collection B',
        collections: [{ collectionId: 200, name: 'Trip B', visible: true, orderIndex: 0 }],
      }),
      makeImage({
        id: 32,
        title: 'In both',
        collections: [
          { collectionId: 100, name: 'Trip A', visible: true, orderIndex: 0 },
          { collectionId: 200, name: 'Trip B', visible: true, orderIndex: 1 },
        ],
      }),
      makeImage({ id: 33, title: 'No collection', collections: [] }),
    ];

    it('filters by single collection ID', () => {
      const result = filterContent(collectionImages, { collectionIds: [100] });
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual([30, 32]);
    });

    it('uses OR logic for multiple collection IDs', () => {
      const result = filterContent(collectionImages, { collectionIds: [100, 200] });
      expect(result).toHaveLength(3);
      expect(result.map(r => r.id)).toEqual([30, 31, 32]);
    });

    it('excludes images with no collections', () => {
      const result = filterContent(collectionImages, { collectionIds: [100] });
      expect(result.map(r => r.id)).not.toContain(33);
    });

    it('returns empty when no images match the collection ID', () => {
      const result = filterContent(collectionImages, { collectionIds: [999] });
      expect(result).toHaveLength(0);
    });
  });

  describe('cross-dimension AND logic with new filters', () => {
    const mixedImages = [
      makeImage({ id: 40, isFilm: true, blackAndWhite: true, rating: 5 }),
      makeImage({ id: 41, isFilm: true, blackAndWhite: false, rating: 3 }),
      makeImage({ id: 42, isFilm: false, blackAndWhite: true, rating: 4 }),
      makeImage({ id: 43, isFilm: false, blackAndWhite: false, rating: 2 }),
    ];

    it('combines isFilm AND minRating', () => {
      const result = filterContent(mixedImages, { isFilm: true, minRating: 4 });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(40);
    });

    it('combines blackAndWhite AND isFilm', () => {
      const result = filterContent(mixedImages, { blackAndWhite: true, isFilm: true });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(40);
    });

    it('combines all three new filters', () => {
      const result = filterContent(mixedImages, {
        isFilm: false,
        blackAndWhite: true,
        minRating: 4,
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(42);
    });
  });
});

describe('edge cases', () => {
  it('returns all content when query is whitespace only', () => {
    const result = filterContent(sampleImages, { query: '   ' });
    expect(result).toHaveLength(3);
  });

  it('returns all content when collectionIds is empty array', () => {
    const result = filterContent(sampleImages, { collectionIds: [] });
    expect(result).toHaveLength(3);
  });

  it('treats minRating: 0 as an active filter (all images with rating >= 0 pass)', () => {
    const result = filterContent(sampleImages, { minRating: 0 });
    // All sample images have ratings (5, 3, 4) — all >= 0, so all pass
    expect(result).toHaveLength(3);
  });

  it('handles single-day date range (dateFrom equals dateTo)', () => {
    const images = [
      makeImage({ id: 10, captureDate: '2024-06-15T12:00:00Z' }),
      makeImage({ id: 11, captureDate: '2024-06-14T23:59:59Z' }),
      makeImage({ id: 12, captureDate: '2024-06-16T00:00:01Z' }),
    ];
    const result = filterContent(images, {
      dateFrom: '2024-06-15',
      dateTo: '2024-06-15',
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(10);
  });
});

// ─── extractFilterOptions ───

describe('extractFilterOptions', () => {
  it('extracts unique ratings sorted descending', () => {
    const options = extractFilterOptions(sampleImages);
    expect(options.ratings).toEqual([5, 4, 3]);
  });

  it('extracts unique people sorted alphabetically', () => {
    const options = extractFilterOptions(sampleImages);
    expect(options.people).toEqual(['Alice', 'Bob']);
  });

  it('extracts unique locations sorted alphabetically', () => {
    const options = extractFilterOptions(sampleImages);
    expect(options.locations).toEqual(['Portland', 'Seattle', 'Tokyo']);
  });

  it('extracts top tags by frequency, then alphabetically within same frequency', () => {
    const options = extractFilterOptions(sampleImages);
    // 'landscape' appears in images 1 and 3 (freq 2), others appear once (freq 1)
    // Within freq 1: architecture, street, sunset (alpha order)
    expect(options.tags).toEqual(['landscape', 'architecture', 'street', 'sunset']);
  });

  it('extracts unique cameras sorted alphabetically', () => {
    const options = extractFilterOptions(sampleImages);
    expect(options.cameras).toEqual(['Nikon Z6', 'Sony A7III']);
  });

  it('skips non-image content', () => {
    const mixed: AnyContentModel[] = [makeTextBlock()];
    const options = extractFilterOptions(mixed);
    expect(options.ratings).toEqual([]);
    expect(options.people).toEqual([]);
  });

  it('detects film and digital presence', () => {
    const images = [makeImage({ id: 1, isFilm: true }), makeImage({ id: 2, isFilm: false })];
    const options = extractFilterOptions(images);
    expect(options.hasFilm).toBe(true);
    expect(options.hasDigital).toBe(true);
  });

  it('returns hasFilm=false when no film images', () => {
    const images = [makeImage({ id: 1, isFilm: false })];
    const options = extractFilterOptions(images);
    expect(options.hasFilm).toBe(false);
    expect(options.hasDigital).toBe(true);
  });

  it('detects BW and color presence', () => {
    const images = [
      makeImage({ id: 1, blackAndWhite: true }),
      makeImage({ id: 2, blackAndWhite: false }),
    ];
    const options = extractFilterOptions(images);
    expect(options.hasBW).toBe(true);
    expect(options.hasColor).toBe(true);
  });

  it('extracts unique collections sorted alphabetically', () => {
    const images = [
      makeImage({
        id: 1,
        collections: [{ collectionId: 10, name: 'Trip B', visible: true, orderIndex: 0 }],
      }),
      makeImage({
        id: 2,
        collections: [{ collectionId: 20, name: 'Trip A', visible: true, orderIndex: 0 }],
      }),
      makeImage({
        id: 3,
        collections: [{ collectionId: 10, name: 'Trip B', visible: true, orderIndex: 1 }],
      }),
    ];
    const options = extractFilterOptions(images);
    expect(options.collections).toEqual([
      { id: 20, name: 'Trip A' },
      { id: 10, name: 'Trip B' },
    ]);
  });

  it('treats undefined isFilm as digital in options', () => {
    const images = [makeImage({ id: 1, isFilm: undefined }), makeImage({ id: 2, isFilm: true })];
    const options = extractFilterOptions(images);
    expect(options.hasFilm).toBe(true);
    expect(options.hasDigital).toBe(true);
  });

  it('treats undefined blackAndWhite as color in options', () => {
    const images = [
      makeImage({ id: 1, blackAndWhite: undefined }),
      makeImage({ id: 2, blackAndWhite: true }),
    ];
    const options = extractFilterOptions(images);
    expect(options.hasBW).toBe(true);
    expect(options.hasColor).toBe(true);
  });

  it('limits tags to top 10 by frequency', () => {
    const images = Array.from({ length: 12 }, (_, i) =>
      makeImage({
        id: i + 1,
        tags: [
          {
            id: i + 1,
            name: `tag-${String(i + 1).padStart(2, '0')}`,
            slug: `tag-${String(i + 1).padStart(2, '0')}`,
          },
        ],
      })
    );
    // Add extra images for first 3 tags to give them higher frequency
    images.push(
      makeImage({ id: 100, tags: [{ id: 1, name: 'tag-01', slug: 'tag-01' }] }),
      makeImage({ id: 101, tags: [{ id: 2, name: 'tag-02', slug: 'tag-02' }] }),
      makeImage({ id: 102, tags: [{ id: 3, name: 'tag-03', slug: 'tag-03' }] })
    );

    const options = extractFilterOptions(images);
    expect(options.tags).toHaveLength(10);
    // Top 3 by frequency should be first
    expect(options.tags[0]).toBe('tag-01');
    expect(options.tags[1]).toBe('tag-02');
    expect(options.tags[2]).toBe('tag-03');
  });
});

// ─── URL param serialization ───

describe('parseFilterFromParams', () => {
  it('parses rating from URLSearchParams', () => {
    const params = new URLSearchParams('rating=4');
    const criteria = parseFilterFromParams(params);
    expect(criteria.minRating).toBe(4);
  });

  it('parses multiple tags from URLSearchParams', () => {
    const params = new URLSearchParams('tag=landscape&tag=sunset');
    const criteria = parseFilterFromParams(params);
    expect(criteria.tags).toEqual(['landscape', 'sunset']);
  });

  it('parses query from URLSearchParams', () => {
    const params = new URLSearchParams('q=sunset');
    const criteria = parseFilterFromParams(params);
    expect(criteria.query).toBe('sunset');
  });

  it('parses date range from URLSearchParams', () => {
    const params = new URLSearchParams('from=2024-01-01&to=2024-12-31');
    const criteria = parseFilterFromParams(params);
    expect(criteria.dateFrom).toBe('2024-01-01');
    expect(criteria.dateTo).toBe('2024-12-31');
  });

  it('ignores invalid rating values', () => {
    const params = new URLSearchParams('rating=abc');
    const criteria = parseFilterFromParams(params);
    expect(criteria.minRating).toBeUndefined();
  });

  it('ignores out-of-range rating values', () => {
    const params = new URLSearchParams('rating=6');
    const criteria = parseFilterFromParams(params);
    expect(criteria.minRating).toBeUndefined();
  });

  it('parses from Record<string, string>', () => {
    const params: Record<string, string> = { rating: '3', q: 'test' };
    const criteria = parseFilterFromParams(params);
    expect(criteria.minRating).toBe(3);
    expect(criteria.query).toBe('test');
  });

  it('returns empty criteria when no params present', () => {
    const params = new URLSearchParams('');
    const criteria = parseFilterFromParams(params);
    expect(criteria).toEqual({});
  });

  it('parses isFilm from URLSearchParams', () => {
    const params = new URLSearchParams('isFilm=true');
    const criteria = parseFilterFromParams(params);
    expect(criteria.isFilm).toBe(true);
  });

  it('parses isFilm=false from URLSearchParams', () => {
    const params = new URLSearchParams('isFilm=false');
    const criteria = parseFilterFromParams(params);
    expect(criteria.isFilm).toBe(false);
  });

  it('parses blackAndWhite from URLSearchParams', () => {
    const params = new URLSearchParams('bw=true');
    const criteria = parseFilterFromParams(params);
    expect(criteria.blackAndWhite).toBe(true);
  });

  it('parses collectionIds from URLSearchParams', () => {
    const params = new URLSearchParams('collection=10&collection=20');
    const criteria = parseFilterFromParams(params);
    expect(criteria.collectionIds).toEqual([10, 20]);
  });

  it('ignores non-numeric collectionIds', () => {
    const params = new URLSearchParams('collection=abc&collection=10');
    const criteria = parseFilterFromParams(params);
    expect(criteria.collectionIds).toEqual([10]);
  });
});

describe('serializeFilterToParams', () => {
  it('serializes rating', () => {
    const params = serializeFilterToParams({ minRating: 4 });
    expect(params.get('rating')).toBe('4');
  });

  it('serializes multiple tags', () => {
    const params = serializeFilterToParams({ tags: ['landscape', 'sunset'] });
    expect(params.getAll('tag')).toEqual(['landscape', 'sunset']);
  });

  it('serializes query', () => {
    const params = serializeFilterToParams({ query: 'hello' });
    expect(params.get('q')).toBe('hello');
  });

  it('serializes date range', () => {
    const params = serializeFilterToParams({ dateFrom: '2024-01-01', dateTo: '2024-12-31' });
    expect(params.get('from')).toBe('2024-01-01');
    expect(params.get('to')).toBe('2024-12-31');
  });

  it('omits empty/undefined values', () => {
    const params = serializeFilterToParams({});
    expect(params.toString()).toBe('');
  });

  it('round-trips through parse and serialize', () => {
    const original: ContentFilterCriteria = {
      minRating: 3,
      tags: ['landscape'],
      people: ['Alice'],
      query: 'sunset',
      dateFrom: '2024-01-01',
    };
    const serialized = serializeFilterToParams(original);
    const parsed = parseFilterFromParams(serialized);
    expect(parsed).toEqual(original);
  });

  it('serializes isFilm', () => {
    const params = serializeFilterToParams({ isFilm: true });
    expect(params.get('isFilm')).toBe('true');
  });

  it('serializes isFilm=false', () => {
    const params = serializeFilterToParams({ isFilm: false });
    expect(params.get('isFilm')).toBe('false');
  });

  it('serializes blackAndWhite', () => {
    const params = serializeFilterToParams({ blackAndWhite: true });
    expect(params.get('bw')).toBe('true');
  });

  it('serializes collectionIds', () => {
    const params = serializeFilterToParams({ collectionIds: [10, 20] });
    expect(params.getAll('collection')).toEqual(['10', '20']);
  });

  it('round-trips new fields through parse and serialize', () => {
    const original: ContentFilterCriteria = {
      minRating: 3,
      tags: ['landscape'],
      isFilm: true,
      blackAndWhite: false,
      collectionIds: [10, 20],
    };
    const serialized = serializeFilterToParams(original);
    const parsed = parseFilterFromParams(serialized);
    expect(parsed).toEqual(original);
  });
});

// ─── computeFilterCounts ───

describe('computeFilterCounts', () => {
  const images = [
    makeImage({
      id: 1,
      rating: 5,
      isFilm: true,
      blackAndWhite: false,
      tags: [
        { id: 1, name: 'landscape', slug: 'landscape' },
        { id: 2, name: 'sunset', slug: 'sunset' },
      ],
      people: [{ id: 1, name: 'Alice', slug: 'alice' }],
      collections: [{ collectionId: 10, name: 'Trip A', visible: true, orderIndex: 0 }],
    }),
    makeImage({
      id: 2,
      rating: 3,
      isFilm: false,
      blackAndWhite: true,
      tags: [{ id: 3, name: 'architecture', slug: 'architecture' }],
      people: [{ id: 2, name: 'Bob', slug: 'bob' }],
      collections: [{ collectionId: 20, name: 'Trip B', visible: true, orderIndex: 0 }],
    }),
    makeImage({
      id: 3,
      rating: 4,
      isFilm: true,
      blackAndWhite: true,
      tags: [{ id: 1, name: 'landscape', slug: 'landscape' }],
      people: [],
      collections: [{ collectionId: 10, name: 'Trip A', visible: true, orderIndex: 1 }],
    }),
  ];

  const availableOptions = extractFilterOptions(images);

  it('counts highly rated images with no other filters active', () => {
    const counts = computeFilterCounts(images, {}, availableOptions);
    // images 1 (rating 5) and 3 (rating 4) are >= 4
    expect(counts.highlyRated).toBe(2);
  });

  it('counts film images with no other filters active', () => {
    const counts = computeFilterCounts(images, {}, availableOptions);
    // images 1 and 3 are film
    expect(counts.film).toBe(2);
  });

  it('counts digital images with no other filters active', () => {
    const counts = computeFilterCounts(images, {}, availableOptions);
    // Only image 2 is digital (isFilm: false); images 1 and 3 are film
    expect(counts.digital).toBe(1);
  });

  it('counts per tag with no other filters active', () => {
    const counts = computeFilterCounts(images, {}, availableOptions);
    // 'landscape' appears in images 1 and 3
    expect(counts.tags['landscape']).toBe(2);
    // 'architecture' appears only in image 2
    expect(counts.tags['architecture']).toBe(1);
    // 'sunset' appears only in image 1
    expect(counts.tags['sunset']).toBe(1);
  });

  it('counts per person with no other filters active', () => {
    const counts = computeFilterCounts(images, {}, availableOptions);
    expect(counts.people['Alice']).toBe(1);
    expect(counts.people['Bob']).toBe(1);
  });

  it('counts per collection with no other filters active', () => {
    const counts = computeFilterCounts(images, {}, availableOptions);
    // collection 10 (Trip A) has images 1 and 3
    expect(counts.collections[10]).toBe(2);
    // collection 20 (Trip B) has image 2
    expect(counts.collections[20]).toBe(1);
  });

  it('film count is contextual: keeps B&W filter active', () => {
    // With B&W active, film count should only count images that are both film AND B&W
    const counts = computeFilterCounts(images, { blackAndWhite: true }, availableOptions);
    // Only image 3 is both film and B&W
    expect(counts.film).toBe(1);
  });

  it('highly rated count is contextual: keeps film filter active', () => {
    // With film active, highly rated count only includes film images with rating >= 4
    const counts = computeFilterCounts(images, { isFilm: true }, availableOptions);
    // Images 1 (film, rating 5) and 3 (film, rating 4) are both film+highlyRated
    expect(counts.highlyRated).toBe(2);
  });

  it('tag count strips current tag filter when computing per-tag counts', () => {
    // With 'landscape' tag active, computing 'sunset' count strips tags and adds sunset
    const counts = computeFilterCounts(images, { tags: ['landscape'] }, availableOptions);
    // 'sunset' count is independent: 1 image has sunset tag
    expect(counts.tags['sunset']).toBe(1);
    // 'landscape' count: without tag filter + landscape = 2 images
    expect(counts.tags['landscape']).toBe(2);
  });

  it('film count respects other active filters — combined criteria', () => {
    // With minRating: 4 active, film count should only include rated images
    const counts = computeFilterCounts(images, { minRating: 4 }, availableOptions);
    // Images with rating >= 4: image 1 (film, rating 5) and image 3 (film, rating 4)
    // film count strips minRating, adds isFilm:true check → images 1 and 3 are film
    expect(counts.film).toBe(2);
  });

  it('tag count with combined active criteria', () => {
    // With isFilm: true and minRating: 4 both active:
    // tag counts strip 'tags' but keep isFilm and minRating
    // Only film+rated images remain in base: images 1 and 3
    // 'landscape' appears in both → 2; 'architecture' only in image 2 (excluded) → 0
    const counts = computeFilterCounts(
      images,
      { isFilm: true as const, minRating: 4 },
      availableOptions
    );
    expect(counts.tags['landscape']).toBe(2);
    expect(counts.tags['architecture']).toBe(0);
  });

  describe('edge cases', () => {
    it('returns zero counts for empty content array', () => {
      const emptyOptions = extractFilterOptions([]);
      const counts = computeFilterCounts([], {}, emptyOptions);
      expect(counts.highlyRated).toBe(0);
      expect(counts.film).toBe(0);
      expect(counts.digital).toBe(0);
      expect(counts.tags).toEqual({});
      expect(counts.people).toEqual({});
      expect(counts.collections).toEqual({});
      expect(counts.locations).toEqual({});
    });
  });
});

describe('computeFilterCounts locations', () => {
  const images = [
    makeImage({
      id: 1,
      rating: 5,
      isFilm: true,
      locations: [{ id: 1, name: 'Dolomites', slug: 'dolomites' }],
    }),
    makeImage({
      id: 2,
      rating: 3,
      isFilm: true,
      locations: [{ id: 1, name: 'Dolomites', slug: 'dolomites' }],
    }),
    makeImage({
      id: 3,
      rating: 4,
      isFilm: false,
      locations: [{ id: 2, name: 'Iceland', slug: 'iceland' }],
    }),
  ];

  const availableOptions = extractFilterOptions(images);

  it('counts images per location with no other filters active', () => {
    const counts = computeFilterCounts(images, {}, availableOptions);
    expect(counts.locations['Dolomites']).toBe(2);
    expect(counts.locations['Iceland']).toBe(1);
  });

  it('strips current locations filter when computing per-location counts', () => {
    // With 'Dolomites' active, the per-location counts should reflect what's
    // available if the user toggled — so 'Iceland' should still report 1.
    const counts = computeFilterCounts(images, { locations: ['Dolomites'] }, availableOptions);
    expect(counts.locations['Iceland']).toBe(1);
    expect(counts.locations['Dolomites']).toBe(2);
  });

  it('respects other active filters when computing location counts', () => {
    // With isFilm: true active, only images 1 and 2 (both Dolomites) remain.
    const counts = computeFilterCounts(images, { isFilm: true }, availableOptions);
    expect(counts.locations['Dolomites']).toBe(2);
    expect(counts.locations['Iceland']).toBe(0);
  });
});

// ─── AND Match Mode ───

describe('filterContent with AND match mode', () => {
  const images: ContentImageModel[] = [
    makeImage({
      id: 10,
      tags: [
        { id: 1, name: 'alpine', slug: 'alpine' },
        { id: 2, name: 'lake', slug: 'lake' },
        { id: 3, name: 'mountain', slug: 'mountain' },
      ],
      people: [
        { id: 1, name: 'Nate', slug: 'nate' },
        { id: 2, name: 'Saxon', slug: 'saxon' },
      ],
      camera: { id: 1, name: 'NIKON Z 6' },
      lens: { id: 1, name: 'NIKKOR Z 24-70mm f/4 S' },
    }),
    makeImage({
      id: 11,
      tags: [
        { id: 1, name: 'alpine', slug: 'alpine' },
        { id: 4, name: 'forest', slug: 'forest' },
      ],
      people: [{ id: 1, name: 'Nate', slug: 'nate' }],
      camera: { id: 2, name: 'SONY A7III' },
      lens: { id: 2, name: 'FE 24-70mm f/2.8 GM' },
    }),
    makeImage({
      id: 12,
      tags: [
        { id: 2, name: 'lake', slug: 'lake' },
        { id: 3, name: 'mountain', slug: 'mountain' },
      ],
      people: [{ id: 2, name: 'Saxon', slug: 'saxon' }],
      camera: { id: 1, name: 'NIKON Z 6' },
      lens: { id: 1, name: 'NIKKOR Z 24-70mm f/4 S' },
    }),
  ];

  it('OR mode (default): matches images with ANY of the selected tags', () => {
    const result = filterContent(images, { tags: ['alpine', 'lake'] });
    expect(result.map(r => r.id)).toEqual([10, 11, 12]);
  });

  it('AND mode: matches images with ALL of the selected tags', () => {
    const result = filterContent(images, { tags: ['alpine', 'lake'], tagMatchMode: 'AND' });
    expect(result.map(r => r.id)).toEqual([10]);
  });

  it('AND mode for people: matches images with ALL selected people', () => {
    const result = filterContent(images, {
      people: ['Nate', 'Saxon'],
      peopleMatchMode: 'AND',
    });
    expect(result.map(r => r.id)).toEqual([10]);
  });

  it('OR mode for people (default): matches images with ANY selected person', () => {
    const result = filterContent(images, { people: ['Nate', 'Saxon'] });
    expect(result.map(r => r.id)).toEqual([10, 11, 12]);
  });

  it('filters by lens name', () => {
    const result = filterContent(images, { lenses: ['NIKKOR Z 24-70mm f/4 S'] });
    expect(result.map(r => r.id)).toEqual([10, 12]);
  });

  it('AND mode across categories: tag AND + person AND', () => {
    const result = filterContent(images, {
      tags: ['alpine'],
      tagMatchMode: 'AND',
      people: ['Nate'],
      peopleMatchMode: 'AND',
    });
    expect(result.map(r => r.id)).toEqual([10, 11]);
  });

  it('AND mode: no matches when no image has all tags', () => {
    const result = filterContent(images, {
      tags: ['alpine', 'lake', 'forest'],
      tagMatchMode: 'AND',
    });
    expect(result).toEqual([]);
  });
});

// ─── extractFilterOptions: lenses ───

describe('extractFilterOptions lenses', () => {
  it('extracts unique lens names sorted alphabetically', () => {
    const images: ContentImageModel[] = [
      makeImage({ id: 20, lens: { id: 1, name: 'NIKKOR Z 24-70mm f/4 S' } }),
      makeImage({ id: 21, lens: { id: 2, name: 'FE 24-70mm f/2.8 GM' } }),
      makeImage({ id: 22, lens: { id: 1, name: 'NIKKOR Z 24-70mm f/4 S' } }),
    ];
    const options = extractFilterOptions(images);
    expect(options.lenses).toEqual(['FE 24-70mm f/2.8 GM', 'NIKKOR Z 24-70mm f/4 S']);
  });

  it('returns empty array when no lenses present', () => {
    const images: ContentImageModel[] = [makeImage({ id: 30 }), makeImage({ id: 31 })];
    const options = extractFilterOptions(images);
    expect(options.lenses).toEqual([]);
  });
});

// ─── Tag Frequency Cap (100% exclusion) ───

describe('extractFilterOptions tag frequency', () => {
  it('excludes tags present on 100% of images from top-10', () => {
    const images: ContentImageModel[] = [
      makeImage({
        id: 40,
        tags: [
          { id: 1, name: 'common', slug: 'common' },
          { id: 2, name: 'unique-a', slug: 'unique-a' },
        ],
      }),
      makeImage({
        id: 41,
        tags: [
          { id: 1, name: 'common', slug: 'common' },
          { id: 3, name: 'unique-b', slug: 'unique-b' },
        ],
      }),
    ];
    const options = extractFilterOptions(images);
    // 'common' appears on 100% of images but extractFilterOptions doesn't exclude it
    // (that logic is in CollectionPageClient's extractCollectionFilterOptions)
    // extractFilterOptions just returns top 10 by frequency
    expect(options.tags).toContain('common');
    expect(options.tags).toContain('unique-a');
    expect(options.tags).toContain('unique-b');
  });

  it('caps at 10 tags sorted by frequency then alphabetically', () => {
    const tags = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `tag-${String(i + 1).padStart(2, '0')}`,
      slug: `tag-${String(i + 1).padStart(2, '0')}`,
    }));
    const images: ContentImageModel[] = [
      makeImage({ id: 50, tags: tags.slice(0, 5) }),
      makeImage({ id: 51, tags: tags.slice(0, 3) }),
      makeImage({ id: 52, tags: tags.slice(5, 10) }),
    ];
    const options = extractFilterOptions(images);
    expect(options.tags).toHaveLength(10);
  });
});

// ─── Collection-page filter derivations ───

function makeCollectionRef(
  overrides: Partial<ContentCollectionModel> = {}
): ContentCollectionModel {
  return {
    id: 1000,
    contentType: 'COLLECTION',
    orderIndex: 0,
    slug: 'child',
    collectionType: 'COLLECTION' as ContentCollectionModel['collectionType'],
    referencedCollectionId: 1,
    ...overrides,
  };
}

function makeFilterState(overrides: Partial<FilterState> = {}): FilterState {
  return { ...INITIAL_FILTER_STATE, ...overrides };
}

describe('extractCollectionFilterOptions', () => {
  it('returns all dimensions empty for an empty input', () => {
    const dims = extractCollectionFilterOptions([]);
    expect(dims.tags.values).toEqual([]);
    expect(dims.people.values).toEqual([]);
    expect(dims.cameras.values).toEqual([]);
    expect(dims.lenses.values).toEqual([]);
    expect(dims.locations.values).toEqual([]);
    expect(dims.lensTypes.values).toEqual([]);
  });

  it('marks a dimension filterable only when a value splits the set', () => {
    // Two images: 'alpine' on both (100% frequency → excluded by 0.9 blanket
    // threshold in extractFilterOptions, so values is []).  canFilter on an
    // empty projection returns false → not filterable.
    const blanketOnly = extractCollectionFilterOptions([
      makeImage({ id: 1, tags: [{ id: 1, name: 'alpine', slug: 'alpine' }] }),
      makeImage({ id: 2, tags: [{ id: 1, name: 'alpine', slug: 'alpine' }] }),
    ]);
    expect(blanketOnly.tags.values).toEqual([]);
    expect(blanketOnly.tags.filterable).toBe(false);

    // 'forest' appears on only one image (50% < 90%) so it survives the threshold.
    // Now alpine (2/2) is still excluded but forest (1/2) is included. One value
    // does not cover all items → filterable.
    const splits = extractCollectionFilterOptions([
      makeImage({
        id: 1,
        tags: [
          { id: 1, name: 'alpine', slug: 'alpine' },
          { id: 2, name: 'forest', slug: 'forest' },
        ],
      }),
      makeImage({ id: 2, tags: [{ id: 1, name: 'alpine', slug: 'alpine' }] }),
    ]);
    expect(splits.tags.filterable).toBe(true);
  });

  it('marks single-value cameras/lenses/locations non-filterable (info-mode)', () => {
    const dims = extractCollectionFilterOptions([
      makeImage({
        id: 1,
        camera: { id: 1, name: 'Sony A7III' },
        lens: { id: 1, name: 'FE 35mm' },
        locations: [{ id: 1, name: 'Seattle', slug: 'seattle' }],
      }),
    ]);
    expect(dims.cameras.values).toEqual(['Sony A7III']);
    expect(dims.cameras.filterable).toBe(false);
    expect(dims.lenses.filterable).toBe(false);
    expect(dims.locations.filterable).toBe(false);
  });

  it('marks cameras/lenses/locations filterable when 2+ distinct values', () => {
    const dims = extractCollectionFilterOptions([
      makeImage({
        id: 1,
        camera: { id: 1, name: 'Sony A7III' },
        lens: { id: 1, name: 'FE 35mm' },
        locations: [{ id: 1, name: 'Seattle', slug: 'seattle' }],
      }),
      makeImage({
        id: 2,
        camera: { id: 2, name: 'Nikon Z6' },
        lens: { id: 2, name: 'NIKKOR 50mm' },
        locations: [{ id: 2, name: 'Tokyo', slug: 'tokyo' }],
      }),
    ]);
    expect(dims.cameras.filterable).toBe(true);
    expect(dims.lenses.filterable).toBe(true);
    expect(dims.locations.filterable).toBe(true);
  });

  it('surfaces lens types only with 2+ distinct categories AND 2+ distinct lenses', () => {
    // wide (24mm) + telephoto (200mm), two distinct lenses → lens types surface, ordered.
    const dims = extractCollectionFilterOptions([
      makeImage({ id: 1, focalLength: '24mm', lens: { id: 1, name: 'FE 24mm' } }),
      makeImage({ id: 2, focalLength: '200mm', lens: { id: 2, name: 'FE 200mm' } }),
    ]);
    expect(dims.lensTypes.values).toEqual(['wide', 'telephoto']);
  });

  it('suppresses lens types when only one category present', () => {
    const dims = extractCollectionFilterOptions([
      makeImage({ id: 1, focalLength: '24mm', lens: { id: 1, name: 'FE 24mm' } }),
      makeImage({ id: 2, focalLength: '28mm', lens: { id: 2, name: 'FE 28mm' } }),
    ]);
    // both 'wide' → only one distinct category
    expect(dims.lensTypes.values).toEqual([]);
  });

  it('suppresses lens types when fewer than 2 distinct lenses', () => {
    // two categories but a single lens object → lenses < 2
    const dims = extractCollectionFilterOptions([
      makeImage({ id: 1, focalLength: '24mm', lens: { id: 1, name: 'FE 24mm' } }),
      makeImage({ id: 2, focalLength: '200mm', lens: { id: 1, name: 'FE 24mm' } }),
    ]);
    expect(dims.lensTypes.values).toEqual([]);
  });

  it('aggregates tags/people/locations from collection refs', () => {
    const dims = extractCollectionFilterOptions(
      [],
      [
        makeCollectionRef({
          id: 2000,
          tags: [{ id: 1, name: 'travel', slug: 'travel' }],
          people: [{ id: 1, name: 'Alice', slug: 'alice' }],
          locations: [{ id: 1, name: 'Rome', slug: 'rome' }],
        }),
      ]
    );
    expect(dims.tags.values).toEqual(['travel']);
    expect(dims.people.values).toEqual(['Alice']);
    expect(dims.locations.values).toEqual(['Rome']);
  });
});

describe('buildCollectionCriteria', () => {
  it('returns an empty object for the initial (no-op) state', () => {
    expect(buildCollectionCriteria(makeFilterState())).toEqual({});
  });

  it('maps highlyRatedOnly to minRating 4', () => {
    expect(buildCollectionCriteria(makeFilterState({ highlyRatedOnly: true }))).toEqual({
      minRating: 4,
    });
  });

  it('uses AND match mode for tags/people/cameras/lenses', () => {
    const criteria = buildCollectionCriteria(
      makeFilterState({
        selectedTags: ['a', 'b'],
        selectedPeople: ['Alice'],
        selectedCameras: ['Sony A7III'],
        selectedLenses: ['FE 35mm'],
      })
    );
    expect(criteria).toEqual({
      tags: ['a', 'b'],
      tagMatchMode: 'AND',
      people: ['Alice'],
      peopleMatchMode: 'AND',
      cameras: ['Sony A7III'],
      cameraMatchMode: 'AND',
      lenses: ['FE 35mm'],
      lensMatchMode: 'AND',
    });
  });

  it('maps locations with no match mode (OR by default)', () => {
    expect(buildCollectionCriteria(makeFilterState({ selectedLocations: ['Rome'] }))).toEqual({
      locations: ['Rome'],
    });
  });

  it('omits empty array dimensions', () => {
    const criteria = buildCollectionCriteria(makeFilterState({ selectedTags: [] }));
    expect(criteria).toEqual({});
  });

  it('does not include lens types (applied as a post-filter, not criteria)', () => {
    const criteria = buildCollectionCriteria(
      makeFilterState({ selectedLensTypes: ['wide' as LensType] })
    );
    expect(criteria).toEqual({});
  });
});

describe('hasAnyActiveFilter', () => {
  it('is false for the initial state', () => {
    expect(hasAnyActiveFilter(makeFilterState())).toBe(false);
  });

  it.each<[string, Partial<FilterState>]>([
    ['highlyRatedOnly', { highlyRatedOnly: true }],
    ['selectedTags', { selectedTags: ['a'] }],
    ['selectedPeople', { selectedPeople: ['Alice'] }],
    ['selectedCameras', { selectedCameras: ['Sony'] }],
    ['selectedLenses', { selectedLenses: ['FE 35mm'] }],
    ['selectedLensTypes', { selectedLensTypes: ['wide' as LensType] }],
    ['selectedLocations', { selectedLocations: ['Rome'] }],
  ])('is true when %s is active', (_label, overrides) => {
    expect(hasAnyActiveFilter(makeFilterState(overrides))).toBe(true);
  });

  it('ignores dateSortDirection (a sort, not a filter)', () => {
    expect(hasAnyActiveFilter(makeFilterState({ dateSortDirection: 'desc' }))).toBe(false);
  });
});

describe('applyCollectionFilters', () => {
  const images = [
    makeImage({ id: 1, rating: 5, focalLength: '24mm' }), // wide
    makeImage({ id: 2, rating: 3, focalLength: '200mm' }), // telephoto
    makeImage({ id: 3, rating: 5, focalLength: undefined }), // unparseable focal length
  ];
  const text = makeTextBlock();
  const allContent: AnyContentModel[] = [images[0]!, images[1]!, text, images[2]!];

  it('filters images by criteria and keeps non-image content in place', () => {
    const result = applyCollectionFilters(allContent, images, { minRating: 5 }, []);
    // images 1 & 3 (rating 5) survive; text block passes through; image 2 dropped
    expect(result.map(c => `${c.contentType}:${c.id}`)).toEqual(['IMAGE:1', 'TEXT:100', 'IMAGE:3']);
  });

  it('applies lens-type post-filter, retaining images with unparseable focal length', () => {
    const result = applyCollectionFilters(allContent, images, {}, ['wide']);
    // image 1 is wide; image 3 has no parseable focalLength → kept; image 2 (telephoto) dropped
    expect(result.map(c => `${c.contentType}:${c.id}`)).toEqual(['IMAGE:1', 'TEXT:100', 'IMAGE:3']);
  });

  it('combines criteria and lens-type post-filter', () => {
    const result = applyCollectionFilters(allContent, images, { minRating: 5 }, ['telephoto']);
    // rating 5 → images 1 & 3; telephoto post-filter keeps image 3 (unparseable) only (image 1 is wide)
    expect(result.map(c => c.id)).toEqual([100, 3]);
  });
});

describe('mergeDateSortedImages', () => {
  it('replaces image slots in order while leaving non-image blocks in place', () => {
    const img1 = makeImage({ id: 1 });
    const img2 = makeImage({ id: 2 });
    const text = makeTextBlock();
    const processed: AnyContentModel[] = [img1, text, img2];
    // Sorted order reverses the two images.
    const sorted = [img2, img1];
    const result = mergeDateSortedImages(processed, sorted);
    expect(result.map(c => `${c.contentType}:${c.id}`)).toEqual(['IMAGE:2', 'TEXT:100', 'IMAGE:1']);
  });

  it('falls back to the original item when sorted runs out', () => {
    const img1 = makeImage({ id: 1 });
    const img2 = makeImage({ id: 2 });
    const result = mergeDateSortedImages([img1, img2], [img2]);
    // second image slot has no sorted entry → keeps the original
    expect(result.map(c => c.id)).toEqual([2, 2]);
  });

  it('returns the array unchanged when there are no images', () => {
    const text = makeTextBlock();
    const result = mergeDateSortedImages([text], []);
    expect(result).toEqual([text]);
  });
});

describe('hasFilterableOptions', () => {
  const emptyDims = extractCollectionFilterOptions([]);

  it('is false when nothing is filterable', () => {
    expect(hasFilterableOptions(emptyDims, false, false)).toBe(false);
  });

  it('is true when Highly Rated is shown', () => {
    expect(hasFilterableOptions(emptyDims, true, false)).toBe(true);
  });

  it('is true when capture dates vary', () => {
    expect(hasFilterableOptions(emptyDims, false, true)).toBe(true);
  });

  it('is true when a tag dimension has values', () => {
    // The 0.9 exclusion ratio drops tags on >=90% of images, so the tag must
    // appear on under that share — give the second image no tags.
    const dims = extractCollectionFilterOptions([
      makeImage({ id: 1, tags: [{ id: 1, name: 'alpine', slug: 'alpine' }] }),
      makeImage({ id: 2, tags: [] }),
    ]);
    expect(dims.tags.values).toEqual(['alpine']);
    expect(hasFilterableOptions(dims, false, false)).toBe(true);
  });

  it('does not trigger on a single-value (non-filterable) location alone', () => {
    const dims = extractCollectionFilterOptions([
      makeImage({ id: 1, locations: [{ id: 1, name: 'Seattle', slug: 'seattle' }] }),
    ]);
    // single location → locations.filterable is false, and no other dimension qualifies
    expect(dims.locations.filterable).toBe(false);
    expect(hasFilterableOptions(dims, false, false)).toBe(false);
  });

  it('triggers on a multi-value (filterable) location', () => {
    const dims = extractCollectionFilterOptions([
      makeImage({ id: 1, locations: [{ id: 1, name: 'Seattle', slug: 'seattle' }] }),
      makeImage({ id: 2, locations: [{ id: 2, name: 'Tokyo', slug: 'tokyo' }] }),
    ]);
    expect(dims.locations.filterable).toBe(true);
    expect(hasFilterableOptions(dims, false, false)).toBe(true);
  });
});

// ─── Location-page filter derivations ───

describe('filmFilterFromIsFilm', () => {
  it('maps true to film', () => {
    expect(filmFilterFromIsFilm(true)).toBe('film');
  });

  it('maps false to digital', () => {
    expect(filmFilterFromIsFilm(false)).toBe('digital');
  });

  it('maps undefined to off', () => {
    const noValue: boolean | undefined = undefined;
    expect(filmFilterFromIsFilm(noValue)).toBe('off');
  });
});

describe('buildLocationCriteria', () => {
  it('returns an empty object for the initial (no-op) state', () => {
    expect(buildLocationCriteria(makeFilterState())).toEqual({});
  });

  it('maps highlyRatedOnly to minRating 4', () => {
    expect(buildLocationCriteria(makeFilterState({ highlyRatedOnly: true }))).toEqual({
      minRating: 4,
    });
  });

  it('maps film filter to isFilm:true', () => {
    expect(buildLocationCriteria(makeFilterState({ filmFilter: 'film' }))).toEqual({
      isFilm: true,
    });
  });

  it('maps digital filter to isFilm:false', () => {
    expect(buildLocationCriteria(makeFilterState({ filmFilter: 'digital' }))).toEqual({
      isFilm: false,
    });
  });

  it('omits isFilm when film filter is off', () => {
    expect(buildLocationCriteria(makeFilterState({ filmFilter: 'off' }))).toEqual({});
  });

  it('uses default (OR) match mode for tags and people — no match-mode keys', () => {
    const criteria = buildLocationCriteria(
      makeFilterState({ selectedTags: ['a', 'b'], selectedPeople: ['Alice'] })
    );
    expect(criteria).toEqual({ tags: ['a', 'b'], people: ['Alice'] });
    expect(criteria).not.toHaveProperty('tagMatchMode');
    expect(criteria).not.toHaveProperty('peopleMatchMode');
  });

  it('does not include collection-only dimensions (locations/cameras/lenses)', () => {
    const criteria = buildLocationCriteria(
      makeFilterState({
        selectedLocations: ['Rome'],
        selectedCameras: ['Sony'],
        selectedLenses: ['FE 35mm'],
      })
    );
    expect(criteria).toEqual({});
  });

  it('round-trips with filmFilterFromIsFilm for the film toggle', () => {
    const criteria = buildLocationCriteria(makeFilterState({ filmFilter: 'film' }));
    expect(filmFilterFromIsFilm(criteria.isFilm)).toBe('film');
  });
});

describe('computeFilterVisibility', () => {
  it('hides every control for an empty or single-image page', () => {
    expect(computeFilterVisibility([])).toEqual({
      dateSort: false,
      highlyRated: false,
      film: false,
      tags: false,
      people: false,
      cameras: false,
      lenses: false,
      locations: false,
      lensTypes: false,
    });
    expect(computeFilterVisibility([makeImage({ id: 1, isFilm: true, rating: 5 })]).film).toBe(
      false
    );
  });

  it('shows film only when both film and digital are present', () => {
    const filmOnly = [makeImage({ id: 1, isFilm: true }), makeImage({ id: 2, isFilm: true })];
    const mixed = [makeImage({ id: 1, isFilm: true }), makeImage({ id: 2, isFilm: false })];
    expect(computeFilterVisibility(filmOnly).film).toBe(false);
    expect(computeFilterVisibility(mixed).film).toBe(true);
  });

  it('shows highlyRated only when images straddle the 4-star line', () => {
    const allHigh = [makeImage({ id: 1, rating: 5 }), makeImage({ id: 2, rating: 4 })];
    const straddle = [makeImage({ id: 1, rating: 5 }), makeImage({ id: 2, rating: 2 })];
    expect(computeFilterVisibility(allHigh).highlyRated).toBe(false);
    expect(computeFilterVisibility(straddle).highlyRated).toBe(true);
  });

  it('shows dateSort only with 2+ distinct capture dates', () => {
    const sameDate = [
      makeImage({ id: 1, captureDate: '2024-01-01T00:00:00Z' }),
      makeImage({ id: 2, captureDate: '2024-01-01T00:00:00Z' }),
    ];
    const varied = [
      makeImage({ id: 1, captureDate: '2024-01-01T00:00:00Z' }),
      makeImage({ id: 2, captureDate: '2024-02-01T00:00:00Z' }),
    ];
    expect(computeFilterVisibility(sameDate).dateSort).toBe(false);
    expect(computeFilterVisibility(varied).dateSort).toBe(true);
  });
});

describe('canFilter', () => {
  it('returns false below 2 items (nothing to split)', () => {
    expect(
      canFilter([makeImage({ id: 1, isFilm: true })], img => [img.isFilm ? 'film' : 'digital'])
    ).toBe(false);
    expect(canFilter([], () => ['x'])).toBe(false);
  });

  it('returns false when one value covers every item', () => {
    const allDigital = [makeImage({ id: 1, isFilm: false }), makeImage({ id: 2, isFilm: false })];
    expect(canFilter(allDigital, img => [img.isFilm ? 'film' : 'digital'])).toBe(false);
  });

  it('returns true when a value matches a proper non-empty subset', () => {
    const mixed = [makeImage({ id: 1, isFilm: true }), makeImage({ id: 2, isFilm: false })];
    expect(canFilter(mixed, img => [img.isFilm ? 'film' : 'digital'])).toBe(true);
  });

  it('counts each item once per distinct value (multi-valued dimensions)', () => {
    // both images carry 'sky'; only img 1 also carries 'sea' → 'sea' splits the set.
    const images = [
      makeImage({
        id: 1,
        tags: [
          { id: 1, name: 'sky', slug: 'sky' },
          { id: 2, name: 'sea', slug: 'sea' },
        ],
      }),
      makeImage({ id: 2, tags: [{ id: 1, name: 'sky', slug: 'sky' }] }),
    ];
    expect(canFilter(images, img => (img.tags ?? []).map(t => t.name))).toBe(true);
  });

  it('returns false when a single shared value blankets a multi-valued dimension', () => {
    const images = [
      makeImage({ id: 1, tags: [{ id: 1, name: 'sky', slug: 'sky' }] }),
      makeImage({ id: 2, tags: [{ id: 1, name: 'sky', slug: 'sky' }] }),
    ];
    expect(canFilter(images, img => (img.tags ?? []).map(t => t.name))).toBe(false);
  });

  it('treats a value present on a subset (others absent) as splitting', () => {
    // camera Canon on img 1, img 2 has no camera → Canon splits 1-of-2.
    const images = [
      makeImage({ id: 1, camera: { id: 1, name: 'Canon' } }),
      makeImage({ id: 2, camera: null }),
    ];
    expect(canFilter(images, img => (img.camera?.name ? [img.camera.name] : []))).toBe(true);
  });
});

describe('applyActiveOverride', () => {
  const hiddenAll = {
    dateSort: false,
    highlyRated: false,
    film: false,
    tags: false,
    people: false,
    cameras: false,
    lenses: false,
    locations: false,
    lensTypes: false,
  };

  it('keeps a control visible when its filter is active even if the gate hid it', () => {
    const result = applyActiveOverride(hiddenAll, makeFilterState({ filmFilter: 'film' }));
    expect(result.film).toBe(true);
    expect(result.highlyRated).toBe(false);
  });

  it('forces an array dimension visible when it has an active selection', () => {
    const result = applyActiveOverride(hiddenAll, makeFilterState({ selectedTags: ['sunset'] }));
    expect(result.tags).toBe(true);
  });

  it('forces dateSort and highlyRated visible when those filters are active', () => {
    expect(
      applyActiveOverride(hiddenAll, makeFilterState({ dateSortDirection: 'desc' })).dateSort
    ).toBe(true);
    expect(
      applyActiveOverride(hiddenAll, makeFilterState({ highlyRatedOnly: true })).highlyRated
    ).toBe(true);
  });

  it('leaves an all-false verdict untouched when no filter is active', () => {
    expect(applyActiveOverride(hiddenAll, makeFilterState())).toEqual(hiddenAll);
  });
});
