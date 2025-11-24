/**
 * Unit tests for contentRendererUtils.ts
 * Tests content normalization and position class determination
 */

import type {
  AnyContentModel,
  ContentCollectionModel,
  ContentGifModel,
  ContentImageModel,
  ContentTextModel,
} from '@/app/types/Content';
import {
  buildParallaxWrapperClassName,
  buildWrapperClassName,
  determineContentRendererProps,
  determinePositionClassName,
  normalizeContentToRendererProps,
} from '@/app/utils/contentRendererUtils';

// Test fixtures
const createImageContent = (
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
  width: 1920,
  height: 1080,
  title: `Image ${id}`,
  alt: `Alt text ${id}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createCollectionContent = (
  id: number,
  overrides?: Partial<ContentCollectionModel>
): ContentCollectionModel => ({
  id,
  contentType: 'COLLECTION',
  orderIndex: id,
  visible: true,
  title: `Collection ${id}`,
  slug: `collection-${id}`,
  collectionType: 'PORTFOLIO',
  coverImage: {
    id: id * 10,
    imageUrl: `https://example.com/cover-${id}.jpg`,
    imageWidth: 1920,
    imageHeight: 1080,
    width: 1920,
    height: 1080,
    contentType: 'IMAGE',
    orderIndex: 0,
    visible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createGifContent = (
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createTextContent = (
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockStyles = {
  imageSingle: 'imageSingle',
  imageLeft: 'imageLeft',
  imageRight: 'imageRight',
  imageMiddle: 'imageMiddle',
};

const mockWrapperStyles = {
  dragContainer: 'dragContainer',
  parallaxContainer: 'parallaxContainer',
  overlayContainer: 'overlayContainer',
  mobile: 'mobile',
  dragging: 'dragging',
  clickable: 'clickable',
  default: 'default',
  selected: 'selected',
};

const mockParallaxStyles = {
  mobile: 'mobile',
  dragging: 'dragging',
  selected: 'selected',
};

describe('contentRendererUtils', () => {
  describe('determinePositionClassName', () => {
    it('should return imageSingle for single item in row', () => {
      expect(determinePositionClassName(1, 0, mockStyles)).toBe('imageSingle');
    });

    it('should return imageLeft for first item in multi-item row', () => {
      expect(determinePositionClassName(2, 0, mockStyles)).toBe('imageLeft');
      expect(determinePositionClassName(3, 0, mockStyles)).toBe('imageLeft');
      expect(determinePositionClassName(5, 0, mockStyles)).toBe('imageLeft');
    });

    it('should return imageRight for last item in multi-item row', () => {
      expect(determinePositionClassName(2, 1, mockStyles)).toBe('imageRight');
      expect(determinePositionClassName(3, 2, mockStyles)).toBe('imageRight');
      expect(determinePositionClassName(5, 4, mockStyles)).toBe('imageRight');
    });

    it('should return imageMiddle for middle items in multi-item row', () => {
      expect(determinePositionClassName(3, 1, mockStyles)).toBe('imageMiddle');
      expect(determinePositionClassName(5, 1, mockStyles)).toBe('imageMiddle');
      expect(determinePositionClassName(5, 2, mockStyles)).toBe('imageMiddle');
      expect(determinePositionClassName(5, 3, mockStyles)).toBe('imageMiddle');
    });

    it('should return empty string if style is missing', () => {
      const emptyStyles = {
        imageSingle: '',
        imageLeft: '',
        imageRight: '',
        imageMiddle: '',
      };
      expect(determinePositionClassName(1, 0, emptyStyles)).toBe('');
      expect(determinePositionClassName(2, 0, emptyStyles)).toBe('');
    });
  });

  describe('normalizeContentToRendererProps', () => {
    describe('COLLECTION content', () => {
      it('should normalize collection with coverImage', () => {
        const collection = createCollectionContent(1);
        const result = normalizeContentToRendererProps(
          collection,
          500,
          300,
          'imageSingle',
          false
        );

        expect(result.contentId).toBe(1);
        expect(result.contentType).toBe('COLLECTION');
        expect(result.imageUrl).toBe('https://example.com/cover-1.jpg');
        expect(result.imageWidth).toBe(1920);
        expect(result.imageHeight).toBe(1080);
        expect(result.alt).toBe('Collection 1');
        expect(result.overlayText).toBe('Collection 1');
        expect(result.cardTypeBadge).toBe('PORTFOLIO');
        expect(result.enableParallax).toBe(true);
        expect(result.hasSlug).toBe('collection-1');
        expect(result.isCollection).toBe(true);
        expect(result.width).toBe(500);
        expect(result.height).toBe(300);
        expect(result.className).toBe('imageSingle');
        expect(result.isMobile).toBe(false);
      });

      it('should handle collection without coverImage', () => {
        const collection = createCollectionContent(1, { coverImage: undefined });
        const result = normalizeContentToRendererProps(
          collection,
          500,
          300,
          'imageLeft',
          true
        );

        expect(result.imageUrl).toBe('');
        expect(result.imageWidth).toBe(800); // Default fallback
        expect(result.imageHeight).toBe(800); // Default fallback
        expect(result.alt).toBe('Collection 1');
      });

      it('should use width/height fallback when imageWidth/imageHeight missing', () => {
        const collection = createCollectionContent(1, {
          coverImage: {
            id: 10,
            imageUrl: 'https://example.com/cover.jpg',
            width: 1600,
            height: 900,
            contentType: 'IMAGE',
            orderIndex: 0,
            visible: true,
          },
        });
        const result = normalizeContentToRendererProps(
          collection,
          500,
          300,
          'imageRight',
          false
        );

        expect(result.imageWidth).toBe(1600);
        expect(result.imageHeight).toBe(900);
      });

      it('should use slug for alt text if title missing', () => {
        const collection = createCollectionContent(1, { title: undefined });
        const result = normalizeContentToRendererProps(
          collection,
          500,
          300,
          'imageSingle',
          false
        );

        expect(result.alt).toBe('collection-1');
      });

      it('should use default alt text if title and slug missing', () => {
        const collection = createCollectionContent(1, {
          title: undefined,
          slug: undefined,
        });
        const result = normalizeContentToRendererProps(
          collection,
          500,
          300,
          'imageSingle',
          false
        );

        expect(result.alt).toBe('Collection');
      });
    });

    describe('IMAGE content', () => {
      it('should normalize image content', () => {
        const image = createImageContent(1);
        const result = normalizeContentToRendererProps(
          image,
          600,
          400,
          'imageLeft',
          false
        );

        expect(result.contentId).toBe(1);
        expect(result.contentType).toBe('IMAGE');
        expect(result.imageUrl).toBe('https://example.com/image-1.jpg');
        expect(result.imageWidth).toBe(1920);
        expect(result.imageHeight).toBe(1080);
        expect(result.alt).toBe('Alt text 1');
        expect(result.enableParallax).toBe(false);
        expect(result.isCollection).toBe(false);
        expect(result.width).toBe(600);
        expect(result.height).toBe(400);
      });

      it('should use width/height fallback when imageWidth/imageHeight missing', () => {
        const image = createImageContent(1, {
          imageWidth: undefined,
          imageHeight: undefined,
          width: 1600,
          height: 900,
        });
        const result = normalizeContentToRendererProps(
          image,
          500,
          300,
          'imageRight',
          false
        );

        expect(result.imageWidth).toBe(1600);
        expect(result.imageHeight).toBe(900);
      });

      it('should use default dimensions when all missing', () => {
        const image = createImageContent(1, {
          imageWidth: undefined,
          imageHeight: undefined,
          width: undefined,
          height: undefined,
        });
        const result = normalizeContentToRendererProps(
          image,
          500,
          300,
          'imageMiddle',
          false
        );

        expect(result.imageWidth).toBe(800);
        expect(result.imageHeight).toBe(800);
      });

      it('should extract alt text with fallback priority', () => {
        const image1 = createImageContent(1, { alt: 'Custom alt' });
        const result1 = normalizeContentToRendererProps(
          image1,
          500,
          300,
          'imageSingle',
          false
        );
        expect(result1.alt).toBe('Custom alt');

        const image2 = createImageContent(1, {
          alt: undefined,
          title: 'Image Title',
        });
        const result2 = normalizeContentToRendererProps(
          image2,
          500,
          300,
          'imageSingle',
          false
        );
        expect(result2.alt).toBe('Image Title');

        const image3 = createImageContent(1, {
          alt: undefined,
          title: undefined,
          caption: 'Image Caption',
        });
        const result3 = normalizeContentToRendererProps(
          image3,
          500,
          300,
          'imageSingle',
          false
        );
        expect(result3.alt).toBe('Image Caption');

        const image4 = createImageContent(1, {
          alt: undefined,
          title: undefined,
          caption: undefined,
        });
        const result4 = normalizeContentToRendererProps(
          image4,
          500,
          300,
          'imageSingle',
          false
        );
        expect(result4.alt).toBe('Image');
      });

      it('should preserve overlayText', () => {
        const image = createImageContent(1, { overlayText: 'Overlay text' });
        const result = normalizeContentToRendererProps(
          image,
          500,
          300,
          'imageSingle',
          false
        );

        expect(result.overlayText).toBe('Overlay text');
      });
    });

    describe('GIF content', () => {
      it('should normalize GIF content', () => {
        const gif = createGifContent(1);
        const result = normalizeContentToRendererProps(
          gif,
          500,
          300,
          'imageLeft',
          false
        );

        expect(result.contentId).toBe(1);
        expect(result.contentType).toBe('GIF');
        expect(result.imageUrl).toBe('https://example.com/gif-1.gif');
        expect(result.imageWidth).toBe(800);
        expect(result.imageHeight).toBe(600);
        expect(result.alt).toBe('GIF 1');
        expect(result.isGif).toBe(true);
        expect(result.enableParallax).toBe(false);
        expect(result.isCollection).toBe(false);
      });

      it('should use default dimensions when width/height missing', () => {
        const gif = createGifContent(1, {
          width: undefined,
          height: undefined,
        });
        const result = normalizeContentToRendererProps(
          gif,
          500,
          300,
          'imageRight',
          false
        );

        expect(result.imageWidth).toBe(800);
        expect(result.imageHeight).toBe(800);
      });

      it('should extract alt text with GIF default', () => {
        const gif = createGifContent(1, {
          alt: undefined,
          title: undefined,
          caption: undefined,
        });
        const result = normalizeContentToRendererProps(
          gif,
          500,
          300,
          'imageSingle',
          false
        );

        expect(result.alt).toBe('GIF');
      });
    });

    describe('TEXT content', () => {
      it('should normalize text content', () => {
        const text = createTextContent(1);
        const result = normalizeContentToRendererProps(
          text,
          500,
          200,
          'imageSingle',
          false
        );

        expect(result.contentId).toBe(1);
        expect(result.contentType).toBe('TEXT');
        expect(result.imageUrl).toBe('');
        expect(result.imageWidth).toBe(800);
        expect(result.imageHeight).toBe(200);
        expect(result.alt).toBe('');
        expect(result.textItems).toEqual([{ type: 'text', value: 'Text content 1' }]);
        expect(result.enableParallax).toBe(false);
        expect(result.isCollection).toBe(false);
      });

      it('should use default dimensions when width/height missing', () => {
        const text = createTextContent(1, {
          width: undefined,
          height: undefined,
        });
        const result = normalizeContentToRendererProps(
          text,
          500,
          200,
          'imageLeft',
          false
        );

        expect(result.imageWidth).toBe(800);
        expect(result.imageHeight).toBe(200); // Default text height
      });
    });

    describe('Base props', () => {
      it('should round calculated width and height', () => {
        const image = createImageContent(1);
        const result = normalizeContentToRendererProps(
          image,
          500.7,
          300.3,
          'imageSingle',
          false
        );

        expect(result.width).toBe(501);
        expect(result.height).toBe(300);
      });

      it('should preserve position className', () => {
        const image = createImageContent(1);
        const result = normalizeContentToRendererProps(
          image,
          500,
          300,
          'imageMiddle',
          false
        );

        expect(result.className).toBe('imageMiddle');
      });

      it('should preserve isMobile flag', () => {
        const image = createImageContent(1);
        const resultMobile = normalizeContentToRendererProps(
          image,
          500,
          300,
          'imageSingle',
          true
        );
        expect(resultMobile.isMobile).toBe(true);

        const resultDesktop = normalizeContentToRendererProps(
          image,
          500,
          300,
          'imageSingle',
          false
        );
        expect(resultDesktop.isMobile).toBe(false);
      });
    });

    describe('Fallback behavior', () => {
      it('should return base props for unknown content type', () => {
        const unknownContent = {
          id: 1,
          contentType: 'UNKNOWN' as 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION',
          orderIndex: 0,
          visible: true,
        } as unknown as AnyContentModel;

        const result = normalizeContentToRendererProps(
          unknownContent,
          500,
          300,
          'imageSingle',
          false
        );

        expect(result.contentId).toBe(1);
        expect(result.imageUrl).toBe('');
        expect(result.imageWidth).toBe(800);
        expect(result.imageHeight).toBe(800);
        expect(result.alt).toBe('');
        expect(result.enableParallax).toBe(false);
      });
    });
  });

  describe('determineContentRendererProps', () => {
    it('should combine position class and content normalization', () => {
      const image = createImageContent(1);
      const item = { content: image, width: 500, height: 300 };
      const result = determineContentRendererProps(
        item,
        2,
        0,
        false,
        mockStyles
      );

      expect(result.className).toBe('imageLeft');
      expect(result.contentId).toBe(1);
      expect(result.contentType).toBe('IMAGE');
      expect(result.width).toBe(500);
      expect(result.height).toBe(300);
    });

    it('should handle different positions correctly', () => {
      const image = createImageContent(1);
      const item = { content: image, width: 500, height: 300 };

      const single = determineContentRendererProps(item, 1, 0, false, mockStyles);
      expect(single.className).toBe('imageSingle');

      const left = determineContentRendererProps(item, 3, 0, false, mockStyles);
      expect(left.className).toBe('imageLeft');

      const right = determineContentRendererProps(item, 3, 2, false, mockStyles);
      expect(right.className).toBe('imageRight');

      const middle = determineContentRendererProps(item, 3, 1, false, mockStyles);
      expect(middle.className).toBe('imageMiddle');
    });

    it('should normalize collection content correctly', () => {
      const collection = createCollectionContent(1);
      const item = { content: collection, width: 500, height: 300 };
      const result = determineContentRendererProps(
        item,
        1,
        0,
        false,
        mockStyles
      );

      expect(result.contentType).toBe('COLLECTION');
      expect(result.enableParallax).toBe(true);
      expect(result.isCollection).toBe(true);
      expect(result.className).toBe('imageSingle');
    });

    it('should normalize text content correctly', () => {
      const text = createTextContent(1);
      const item = { content: text, width: 500, height: 200 };
      const result = determineContentRendererProps(
        item,
        2,
        1,
        true,
        mockStyles
      );

      expect(result.contentType).toBe('TEXT');
      expect(result.textItems).toEqual([{ type: 'text', value: 'Text content 1' }]);
      expect(result.className).toBe('imageRight');
      expect(result.isMobile).toBe(true);
    });
  });

  describe('buildWrapperClassName', () => {
    it('should return only position class when no options provided', () => {
      const result = buildWrapperClassName('imageSingle', mockWrapperStyles);
      expect(result).toBe('imageSingle default');
    });

    it('should include dragContainer when includeDragContainer is true', () => {
      const result = buildWrapperClassName('imageLeft', mockWrapperStyles, {
        includeDragContainer: true,
        enableDragAndDrop: true, // Suppress default class
      });
      expect(result).toBe('imageLeft dragContainer');
    });

    it('should include parallaxContainer and overlayContainer when enableParallax is true', () => {
      const result = buildWrapperClassName('imageRight', mockWrapperStyles, {
        enableParallax: true,
        enableDragAndDrop: true, // Suppress default class
      });
      expect(result).toBe('imageRight parallaxContainer overlayContainer');
    });

    it('should include mobile class when isMobile is true', () => {
      const result = buildWrapperClassName('imageSingle', mockWrapperStyles, {
        isMobile: true,
        enableDragAndDrop: true, // Suppress default class
      });
      expect(result).toBe('imageSingle mobile');
    });

    it('should include dragging class when isDragged is true', () => {
      const result = buildWrapperClassName('imageLeft', mockWrapperStyles, {
        isDragged: true,
        enableDragAndDrop: true, // Suppress default class
      });
      expect(result).toBe('imageLeft dragging');
    });

    it('should include clickable class when hasClickHandler is true and enableDragAndDrop is false', () => {
      const result = buildWrapperClassName('imageRight', mockWrapperStyles, {
        hasClickHandler: true,
        enableDragAndDrop: false,
      });
      expect(result).toBe('imageRight clickable');
    });

    it('should include default class when hasClickHandler is false and enableDragAndDrop is false', () => {
      const result = buildWrapperClassName('imageSingle', mockWrapperStyles, {
        hasClickHandler: false,
        enableDragAndDrop: false,
      });
      expect(result).toBe('imageSingle default');
    });

    it('should not include clickable or default when enableDragAndDrop is true', () => {
      const result = buildWrapperClassName('imageLeft', mockWrapperStyles, {
        hasClickHandler: true,
        enableDragAndDrop: true,
      });
      expect(result).toBe('imageLeft');
    });

    it('should include selected class when isSelected is true', () => {
      const result = buildWrapperClassName('imageRight', mockWrapperStyles, {
        isSelected: true,
        enableDragAndDrop: true, // Suppress default class
      });
      expect(result).toBe('imageRight selected');
    });

    it('should combine multiple classes correctly', () => {
      const result = buildWrapperClassName('imageSingle', mockWrapperStyles, {
        includeDragContainer: true,
        isMobile: true,
        isDragged: true,
        hasClickHandler: true,
        enableDragAndDrop: false,
        isSelected: true,
      });
      expect(result).toBe('imageSingle dragContainer mobile dragging clickable selected');
    });

    it('should filter out empty strings', () => {
      const result = buildWrapperClassName('imageLeft', mockWrapperStyles, {
        includeDragContainer: false,
        enableParallax: false,
        isMobile: false,
        isDragged: false,
        enableDragAndDrop: false,
        hasClickHandler: false,
        isSelected: false,
      });
      expect(result).toBe('imageLeft default');
    });
  });

  describe('buildParallaxWrapperClassName', () => {
    it('should return only position class when no options provided', () => {
      const result = buildParallaxWrapperClassName('imageSingle', mockParallaxStyles);
      expect(result).toBe('imageSingle');
    });

    it('should include mobile class when isMobile is true', () => {
      const result = buildParallaxWrapperClassName('imageLeft', mockParallaxStyles, {
        isMobile: true,
      });
      expect(result).toBe('imageLeft mobile');
    });

    it('should include dragging class when isDragged is true', () => {
      const result = buildParallaxWrapperClassName('imageRight', mockParallaxStyles, {
        isDragged: true,
      });
      expect(result).toBe('imageRight dragging');
    });

    it('should include selected class when isSelected is true', () => {
      const result = buildParallaxWrapperClassName('imageSingle', mockParallaxStyles, {
        isSelected: true,
      });
      expect(result).toBe('imageSingle selected');
    });

    it('should combine multiple classes correctly', () => {
      const result = buildParallaxWrapperClassName('imageLeft', mockParallaxStyles, {
        isMobile: true,
        isDragged: true,
        isSelected: true,
      });
      expect(result).toBe('imageLeft mobile dragging selected');
    });

    it('should filter out empty strings', () => {
      const result = buildParallaxWrapperClassName('imageRight', mockParallaxStyles, {
        isMobile: false,
        isDragged: false,
        isSelected: false,
      });
      expect(result).toBe('imageRight');
    });

    it('should handle partial options', () => {
      const result = buildParallaxWrapperClassName('imageSingle', mockParallaxStyles, {
        isMobile: true,
        // isDragged and isSelected not provided (default to false)
      });
      expect(result).toBe('imageSingle mobile');
    });
  });
});

