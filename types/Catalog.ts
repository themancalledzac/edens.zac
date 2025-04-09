import { Image } from './Image';

/**
 * Photography Portfolio Catalog containing:
 *
 * @property {number} id - Unique identifier
 * @property {string} title - Title of Catalog, i.e. Amsterdam or Nature
 * @property {string} location - Location of Catalog.
 * @property {number} priority - determines the importance on our home page
 * @property {string} description - Description of Catalog.
 * @property {string} coverImageUrl - Location of image in S3
 * @property {string[]} people - Associated people for this Catalog.
 * @property {string[]} tags - Associated Tags for this Catalog, i.e. Europe, Hiking, Raining
 * @property {Image[]} images - List of all Images associated with this Catalog.
 * @property {string} slug - Slug
 * @property {string} date - Date
 * @property {boolean} isHomeCard - If Home card or not.
 */
export interface Catalog {
  id: number;
  title: string;
  location?: string;
  priority: number;
  description?: string;
  coverImageUrl: string;
  people?: string[];
  tags?: string[];
  images?: Image[];
  slug: string;
  date: string;
  isHomeCard: boolean;
}

//     catalogs: <CatalogMin[]> // Future idea of catalogs having catalogs

// Small catalog object for return data of Image.catalog array
export interface CatalogCreateDTO {
  title: string;
  location: string;
  priority: number;
  description: string;
  isHomeCard: boolean;
}