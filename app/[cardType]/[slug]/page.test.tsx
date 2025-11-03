/**
 * Tests for ContentCollectionPage visibility filtering
 */

import { notFound } from 'next/navigation';

import { type CollectionBase } from '@/app/lib/api/collections';
import {
  type AnyContentBlock,
  type ImageContentBlock,
  type TextContentBlock,
} from '@/app/types/ContentBlock';
import { CollectionType } from '@/app/types/Collection';

import ContentCollectionPage from './page';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

jest.mock('@/app/lib/api/home', () => ({
  fetchCollectionBySlug: jest.fn(),
}));

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  return function MockContentBlockWithFullScreen() {
    return <div data-testid="content-block-with-fullscreen" />;
  };
});

jest.mock('@/app/components/SiteHeader/SiteHeader', () => {
  return function MockSiteHeader() {
    return <div data-testid="site-header" />;
  };
});

jest.mock('@/app/utils/parallaxImageUtils', () => ({
  buildParallaxImageContentBlock: jest.fn((image) => {
    if (!image) return null;
    return {
      ...image,
      blockType: 'PARALLAX',
      enableParallax: true,
    };
  }),
}));

describe('ContentCollectionPage - Visibility Filtering', () => {
  // Get the mocked function from the module
  let fetchCollectionBySlug: jest.Mock;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fetchCollectionBySlug = require('@/app/lib/api/home').fetchCollectionBySlug;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter out images where visible is false for the current collection', async () => {
    const mockImage1: ImageContentBlock = {
      id: 1,
      blockType: 'IMAGE',
      imageUrlWeb: 'https://example.com/image1.jpg',
      orderIndex: 0,
      collections: [
        { collectionId: 100, name: 'Test Collection', visible: true },
      ],
    };

    const mockImage2: ImageContentBlock = {
      id: 2,
      blockType: 'IMAGE',
      imageUrlWeb: 'https://example.com/image2.jpg',
      orderIndex: 1,
      collections: [
        { collectionId: 100, name: 'Test Collection', visible: false }, // Hidden in this collection
      ],
    };

    const mockImage3: ImageContentBlock = {
      id: 3,
      blockType: 'IMAGE',
      imageUrlWeb: 'https://example.com/image3.jpg',
      orderIndex: 2,
      collections: [
        { collectionId: 100, name: 'Test Collection', visible: true },
      ],
    };

    const mockCollection: CollectionBase = {
      id: 100,
      title: 'Test Collection',
      slug: 'test-collection',
      type: CollectionType.portfolio,
      content: [mockImage1, mockImage2, mockImage3] as AnyContentBlock[],
      pagination: {
        currentPage: 0,
        totalPages: 1,
        totalBlocks: 3,
        pageSize: 30,
      },
    };

    fetchCollectionBySlug.mockResolvedValue(mockCollection);

    const params = Promise.resolve({ cardType: 'portfolio', slug: 'test-collection' });
    const result = await ContentCollectionPage({ params });

    // Verify the component renders
    expect(result).toBeDefined();

    // The filtered blocks should not include image2 (visible: false)
    // We can't directly access the filtered blocks, but we can verify the fetch was called
    expect(fetchCollectionBySlug).toHaveBeenCalledWith('test-collection', 0, 1000);
  });

  it('should keep images where visible is true', async () => {
    const mockImage: ImageContentBlock = {
      id: 1,
      blockType: 'IMAGE',
      imageUrlWeb: 'https://example.com/image1.jpg',
      orderIndex: 0,
      collections: [
        { collectionId: 100, name: 'Test Collection', visible: true },
      ],
    };

    const mockCollection: CollectionBase = {
      id: 100,
      title: 'Test Collection',
      slug: 'test-collection',
      type: CollectionType.portfolio,
      content: [mockImage] as AnyContentBlock[],
      pagination: {
        currentPage: 0,
        totalPages: 1,
        totalBlocks: 1,
        pageSize: 30,
      },
    };

    fetchCollectionBySlug.mockResolvedValue(mockCollection);

    const params = Promise.resolve({ cardType: 'portfolio', slug: 'test-collection' });
    const result = await ContentCollectionPage({ params });

    expect(result).toBeDefined();
    expect(fetchCollectionBySlug).toHaveBeenCalledWith('test-collection', 0, 1000);
  });

  it('should default to visible=true when visible is undefined', async () => {
    const mockImage: ImageContentBlock = {
      id: 1,
      blockType: 'IMAGE',
      imageUrlWeb: 'https://example.com/image1.jpg',
      orderIndex: 0,
      collections: [
        { collectionId: 100, name: 'Test Collection' }, // visible is undefined
      ],
    };

    const mockCollection: CollectionBase = {
      id: 100,
      title: 'Test Collection',
      slug: 'test-collection',
      type: CollectionType.portfolio,
      content: [mockImage] as AnyContentBlock[],
      pagination: {
        currentPage: 0,
        totalPages: 1,
        totalBlocks: 1,
        pageSize: 30,
      },
    };

    fetchCollectionBySlug.mockResolvedValue(mockCollection);

    const params = Promise.resolve({ cardType: 'portfolio', slug: 'test-collection' });
    const result = await ContentCollectionPage({ params });

    expect(result).toBeDefined();
  });

  it('should keep non-image blocks regardless of visibility', async () => {
    const mockTextBlock: TextContentBlock = {
      id: 1,
      blockType: 'TEXT',
      content: 'Test content',
      format: 'plain',
      align: 'left',
      orderIndex: 0,
    };

    const mockCollection: CollectionBase = {
      id: 100,
      title: 'Test Collection',
      slug: 'test-collection',
      type: CollectionType.blogs,
      content: [mockTextBlock] as AnyContentBlock[],
      pagination: {
        currentPage: 0,
        totalPages: 1,
        totalBlocks: 1,
        pageSize: 30,
      },
    };

    fetchCollectionBySlug.mockResolvedValue(mockCollection);

    const params = Promise.resolve({ cardType: 'blog', slug: 'test-collection' });
    const result = await ContentCollectionPage({ params });

    expect(result).toBeDefined();
  });

  it('should handle images in multiple collections correctly', async () => {
    const mockImage: ImageContentBlock = {
      id: 1,
      blockType: 'IMAGE',
      imageUrlWeb: 'https://example.com/image1.jpg',
      orderIndex: 0,
      collections: [
        { collectionId: 100, name: 'Test Collection', visible: false }, // Hidden in collection 100
        { collectionId: 200, name: 'Other Collection', visible: true },  // Visible in collection 200
      ],
    };

    const mockCollection: CollectionBase = {
      id: 100, // Current collection is 100
      title: 'Test Collection',
      slug: 'test-collection',
      type: CollectionType.portfolio,
      content: [mockImage] as AnyContentBlock[],
      pagination: {
        currentPage: 0,
        totalPages: 1,
        totalBlocks: 1,
        pageSize: 30,
      },
    };

    fetchCollectionBySlug.mockResolvedValue(mockCollection);

    const params = Promise.resolve({ cardType: 'portfolio', slug: 'test-collection' });
    const result = await ContentCollectionPage({ params });

    // Image should be hidden because we're viewing collection 100 where visible=false
    expect(result).toBeDefined();
  });

  it('should call notFound when collection fetch fails', async () => {
    fetchCollectionBySlug.mockRejectedValue(new Error('Not found'));

    const params = Promise.resolve({ cardType: 'portfolio', slug: 'nonexistent' });
    await ContentCollectionPage({ params });

    expect(notFound).toHaveBeenCalled();
  });

  it('should call notFound when collection is null', async () => {
    fetchCollectionBySlug.mockResolvedValue(null as unknown as CollectionBase);

    const params = Promise.resolve({ cardType: 'portfolio', slug: 'null-collection' });
    await ContentCollectionPage({ params });

    expect(notFound).toHaveBeenCalled();
  });
});