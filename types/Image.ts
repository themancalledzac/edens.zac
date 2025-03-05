import {Catalog} from "./Catalog";

export type Rating = 1 | 2 | 3 | 4 | 5;

/**
 * Photography Portfolio Image object, containing the following metadata:
 *
 * @property {number} id - Unique identifier
 * @property {string} title - Image Title, usually just the image number like _12345.jpeg unless updated
 * @property {number} imageWidth
 * @property {number} imageHeight
 * @property {number} iso - Camera ISO strength
 * @property {string} author - Usually me
 * @property {Rating} rating - 1-5 rating, 5 being the best
 * @property {string} lens - Camera Lens
 * @property {boolean} blackAndWhite - if BW
 * @property {string} shutterSpeed - like 1/60 or 1/500
 * @property {string} rawFileName - Usually image number like _12345.jpeg, what title is based off of
 * @property {string} camera
 * @property {string} focalLength - like 25mm or 70mm
 * @property {string} location - Location of Image(usually same as Catalog)
 * @property {string} imageUrlWeb - S3 location for our Web version Url
 * @property {string} imageUrlSmall - S3 location of SMALL sized image ( thumbnail )
 * @property {string} imageUrlRaw - S3 location of RAW image
 * @property {Catalog[]} catalog - List of all associated catalogs
 * @property {Date} createDate - DATE of creation
 * @property {Date} updateDate - DATE of last edit
 * @property {string} fstop - such as F1.2, F8, F11
 */
export interface Image {
    id: number;
    title: string;
    imageWidth: number;
    imageHeight: number;
    iso: number;
    author: string;
    rating: Rating;
    lens: string;
    blackAndWhite: boolean;
    shutterSpeed: string;
    rawFileName: string;
    camera: string;
    focalLength: string;
    location: string;
    imageUrlWeb: string | null;
    imageUrlSmall: string | null;
    imageUrlRaw: string | null;
    catalog: Catalog[];
    createDate: Date;
    updateDate: Date;
    fstop: string;
}