import { Blog } from '@/types/Blog';
import { Catalog } from '@/types/Catalog';

/**
 * Base interface for all home page items
 * Provides common properties needed for template-based rendering
 *
 */
export interface HomePageItem {
  id: number;
  order: number;
  title: string;
  coverImage: string;
  type: 'catalog' | 'blog' | 'gif' | 'feature' | 'custom';
  desktopOrder?: number;
  mobileOrder?: number;
}

/**
 * Catalog-specific homepage item
 */
export interface CatalogHomeItem extends HomePageItem {
  type: 'catalog';
  content?: Catalog;
}

export interface BlogHomeItem extends HomePageItem {
  type: 'blog';
  displayMode?: 'compact' | 'featured';
  content?: Blog;
  // TODO: thoughts on what else we need on the home page object
}

// The full template type
export type HomePageTemplate = HomePageItem[];
