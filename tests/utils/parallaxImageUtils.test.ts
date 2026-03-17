/**
 * Tests for parallaxImageUtils
 * Tests building parallax image content blocks from various content models
 */
import type { ContentImageModel } from '@/app/types/Content';
import {
  buildParallaxImageContentBlock,
  buildParallaxImageFromContent,
} from '@/app/utils/parallaxImageUtils';
import {
  createCollectionContent,
  createGifContent,
  createImageContent,
  createParallaxContent,
} from '@/tests/fixtures/contentFixtures';

describe('buildParallaxImageContentBlock', () => {
  it('should create parallax image model from valid image', () => {
    const image: ContentImageModel = createImageContent(1, {
      imageUrl: 'https://example.com/photo.jpg',
      imageWidth: 1920,
      imageHeight: 1080,
    });

    const result = buildParallaxImageContentBlock(image, '2024-01-01', 'PORTFOLIO', 'My Collection');

    expect(result).not.toBeNull();
    expect(result!.enableParallax).toBe(true);
    expect(result!.contentType).toBe('IMAGE');
    expect(result!.title).toBe('My Collection');
    expect(result!.overlayText).toBe('My Collection');
    expect(result!.cardTypeBadge).toBe('PORTFOLIO');
    expect(result!.collectionDate).toBe('2024-01-01');
    expect(result!.type).toBe('PORTFOLIO');
  });

  it('should return null when image is undefined', () => {
    const result = buildParallaxImageContentBlock(undefined, '2024-01-01', 'BLOG', 'Title');
    expect(result).toBeNull();
  });

  it('should preserve original image URL and dimensions', () => {
    const image = createImageContent(5, {
      imageUrl: 'https://cdn.example.com/big-photo.jpg',
      imageWidth: 3000,
      imageHeight: 2000,
    });

    const result = buildParallaxImageContentBlock(image, '2024-06-15', 'ART_GALLERY', 'Art Show');
    expect(result!.imageUrl).toBe('https://cdn.example.com/big-photo.jpg');
    expect(result!.imageWidth).toBe(3000);
    expect(result!.imageHeight).toBe(2000);
  });
});

describe('buildParallaxImageFromContent', () => {
  it('should return parallax content as-is if already parallax', () => {
    const parallax = createParallaxContent(1);
    const result = buildParallaxImageFromContent(parallax);
    expect(result).toBe(parallax);
  });

  it('should convert ImageContentModel to parallax', () => {
    const image = createImageContent(2, { rating: 4 });
    const result = buildParallaxImageFromContent(image);

    expect(result.enableParallax).toBe(true);
    expect(result.contentType).toBe('IMAGE');
    expect(result.id).toBe(2);
    expect(result.imageUrl).toBe('https://example.com/image-2.jpg');
  });

  it('should convert CollectionContentModel to parallax', () => {
    const collection = createCollectionContent(3, {
      title: 'Summer Shots',
      collectionType: 'BLOG',
    });

    const result = buildParallaxImageFromContent(collection);

    expect(result.enableParallax).toBe(true);
    expect(result.contentType).toBe('IMAGE');
    expect(result.overlayText).toBe('Summer Shots');
    expect(result.cardTypeBadge).toBe('BLOG');
  });

  it('should handle CollectionContentModel with no coverImage', () => {
    const collection = createCollectionContent(4, {
      coverImage: null,
    });

    const result = buildParallaxImageFromContent(collection);

    expect(result.enableParallax).toBe(true);
    expect(result.imageUrl).toBe('');
    expect(result.imageWidth).toBe(800); // Default fallback
    expect(result.imageHeight).toBe(800);
  });

  it('should handle GIF content type', () => {
    const gif = createGifContent(5, {
      title: 'Animated',
      width: 640,
      height: 480,
    });

    const result = buildParallaxImageFromContent(gif);

    expect(result.enableParallax).toBe(true);
    expect(result.contentType).toBe('IMAGE');
    expect(result.overlayText).toBe('Animated');
  });

  it('should use Untitled for content without title', () => {
    const image = createImageContent(6, { title: undefined });
    const result = buildParallaxImageFromContent(image);
    expect(result.overlayText).toBe('Untitled Image');
  });
});
