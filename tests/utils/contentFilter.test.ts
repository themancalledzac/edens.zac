import { type AnyContentModel, type ContentImageModel, type ContentTextModel } from '@/app/types/Content';
import {
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
    tags: [{ id: 1, name: 'landscape' }, { id: 2, name: 'sunset' }],
    people: [{ id: 1, name: 'Alice' }],
    createDate: '2024-06-15T18:30:00Z',
  }),
  makeImage({
    id: 2,
    title: 'Portland Bridge',
    rating: 3,
    location: { id: 2, name: 'Portland' },
    camera: { id: 2, name: 'Nikon Z6' },
    tags: [{ id: 3, name: 'architecture' }],
    people: [],
    createDate: '2024-03-10T12:00:00Z',
  }),
  makeImage({
    id: 3,
    title: 'Tokyo Street',
    rating: 4,
    location: { id: 3, name: 'Tokyo' },
    camera: { id: 1, name: 'Sony A7III' },
    tags: [{ id: 4, name: 'street' }, { id: 1, name: 'landscape' }],
    people: [{ id: 2, name: 'Bob' }],
    createDate: '2024-09-01T08:00:00Z',
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

  it('extracts unique tags sorted alphabetically', () => {
    const options = extractFilterOptions(sampleImages);
    expect(options.tags).toEqual(['architecture', 'landscape', 'street', 'sunset']);
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
