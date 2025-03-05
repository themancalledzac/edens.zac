import {Image} from "./Image";

/**
 * Photography Portfolio Catalog containing:
 *
 * @property {number} id - Unique identifier
 * @property {Image} imageMain - Image we would use for a front cover
 * @property {Image[]} images - List of all Images associated with this Catalog.
 * @property {string} location - Location of Catalog.
 * @property {string} name - Name of Catalog, i.e. Amsterdam or Nature
 * @property {string} priority - determines the importance on our home page ( TODO: Update this? )
 * @property {string[]} people - Associated people for this Catalog.
 * @property {string[]} tags - Associated Tags for this Catalog, i.e. Europe, Hiking, Raining
 */
export interface Catalog {
    id: number;
    imageMain: Image
    images?: Image[]
    location?: string;
    name: string;
    priority: number;
    people?: string[];
    tags?: string[];
//     catalogs: <Catalog[]> // Future idea of catalogs having catalogs
}