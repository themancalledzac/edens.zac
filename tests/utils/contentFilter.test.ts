import {
  type AnyContentModel,
  type ContentImageModel,
  type ContentTextModel,
} from '@/app/types/Content';
import {
  computeFilterCounts,
  type ContentFilterCriteria,
  extractFilterOptions,
  filterContent,
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
    location: { id: 1, name: 'Seattle' },
    camera: { id: 1, name: 'Sony A7III' },
    tags: [
      { id: 1, name: 'landscape' },
      { id: 2, name: 'sunset' },
    ],
    people: [{ id: 1, name: 'Alice' }],
    captureDate: '2024-06-15T18:30:00Z',
  }),
  makeImage({
    id: 2,
    title: 'Portland Bridge',
    rating: 3,
    location: { id: 2, name: 'Portland' },
    camera: { id: 2, name: 'Nikon Z6' },
    tags: [{ id: 3, name: 'architecture' }],
    people: [],
    captureDate: '2024-03-10T12:00:00Z',
  }),
  makeImage({
    id: 3,
    title: 'Tokyo Street',
    rating: 4,
    location: { id: 3, name: 'Tokyo' },
    camera: { id: 1, name: 'Sony A7III' },
    tags: [
      { id: 4, name: 'street' },
      { id: 1, name: 'landscape' },
    ],
    people: [{ id: 2, name: 'Bob' }],
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
        { id: 1, name: 'landscape' },
        { id: 2, name: 'sunset' },
      ],
      people: [{ id: 1, name: 'Alice' }],
      collections: [{ collectionId: 10, name: 'Trip A', visible: true, orderIndex: 0 }],
    }),
    makeImage({
      id: 2,
      rating: 3,
      isFilm: false,
      blackAndWhite: true,
      tags: [{ id: 3, name: 'architecture' }],
      people: [{ id: 2, name: 'Bob' }],
      collections: [{ collectionId: 20, name: 'Trip B', visible: true, orderIndex: 0 }],
    }),
    makeImage({
      id: 3,
      rating: 4,
      isFilm: true,
      blackAndWhite: true,
      tags: [{ id: 1, name: 'landscape' }],
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
});
