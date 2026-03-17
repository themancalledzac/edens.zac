import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import type {
  AnyContentModel,
  ContentCollectionModel,
  ContentGifModel,
  ContentImageModel,
  ContentParallaxImageModel,
  ContentTextModel,
} from '@/app/types/Content';

// Base image factory - most complete version with all common defaults
export const createImageContent = (
  id: number,
  overrides?: Partial<ContentImageModel>
): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  visible: true,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  title: `Image ${id}`,
  rating: 0,
  ...overrides,
});

// Horizontal image shorthand (1920x1080, AR ~1.78)
export const createHorizontalImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1920,
    imageHeight: 1080,
    aspectRatio: 1920 / 1080,
    rating,
  });

// Vertical image shorthand (1080x1920, AR ~0.56)
export const createVerticalImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1080,
    imageHeight: 1920,
    aspectRatio: 1080 / 1920,
    rating,
  });

// Square image shorthand (1000x1000, AR 1.0)
export const createSquareImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1000,
    imageHeight: 1000,
    aspectRatio: 1,
    rating,
  });

// Panorama shorthand (3000x1000, AR 3.0)
export const createPanorama = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 3000,
    imageHeight: 1000,
    aspectRatio: 3,
    rating,
  });

// Short aliases used in rowCombination and rowOptimizer tests
export const H = (id: number, rating: number): ContentImageModel => createHorizontalImage(id, rating);
export const V = (id: number, rating: number): ContentImageModel => createVerticalImage(id, rating);

// Parallax image factory
export const createParallaxContent = (
  id: number,
  overrides?: Partial<ContentParallaxImageModel>
): ContentParallaxImageModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  visible: true,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  width: 1920,
  height: 1080,
  enableParallax: true,
  title: `Parallax ${id}`,
  ...overrides,
});

// Text content factory
export const createTextContent = (
  id: number,
  overrides?: Partial<ContentTextModel>
): ContentTextModel => ({
  id,
  contentType: 'TEXT',
  orderIndex: id,
  visible: true,
  items: [{ type: 'text', value: `Text content ${id}` }],
  format: 'plain',
  align: 'left',
  width: 800,
  height: 200,
  ...overrides,
});

// GIF content factory
export const createGifContent = (
  id: number,
  overrides?: Partial<ContentGifModel>
): ContentGifModel => ({
  id,
  contentType: 'GIF',
  orderIndex: id,
  visible: true,
  gifUrl: `https://example.com/gif-${id}.gif`,
  width: 800,
  height: 600,
  title: `GIF ${id}`,
  ...overrides,
});

// Collection content factory
export const createCollectionContent = (
  id: number,
  overrides?: Partial<ContentCollectionModel>
): ContentCollectionModel => ({
  id,
  contentType: 'COLLECTION',
  orderIndex: id,
  visible: true,
  title: `Collection ${id}`,
  slug: `collection-${id}`,
  collectionType: CollectionType.PORTFOLIO,
  referencedCollectionId: id * 100,
  coverImage: {
    id: id * 10,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: `https://example.com/cover-${id}.jpg`,
    imageWidth: 1920,
    imageHeight: 1080,
    visible: true,
  },
  ...overrides,
});

// Collection model factory (for createHeaderRow tests)
export const createCollectionModel = (
  id: number,
  overrides?: Partial<CollectionModel>
): CollectionModel => ({
  id,
  type: CollectionType.PORTFOLIO,
  title: `Collection ${id}`,
  slug: `collection-${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  coverImage: {
    id: id * 10,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: `https://example.com/cover-${id}.jpg`,
    imageWidth: 1920,
    imageHeight: 1080,
    visible: true,
  },
  collectionDate: '2024-01-01',
  location: 'Seattle, WA',
  description: 'A beautiful collection description',
  ...overrides,
});

// Suppress unused import warning — AnyContentModel is exported for convenience
export type { AnyContentModel };
