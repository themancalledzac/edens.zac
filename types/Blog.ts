import { type Image } from '@/types/Image';

export interface Blog {

  id: number;
  title: string;
  date: string;
  location: string;
  paragraph: string;
  images: Image[];
  author: string;
  tags: string[];
  coverImageUrl: string;
  slug: string;
}

// Small blog object for return data of Image.blog array
export interface BlogMin {
  id: number;
  title: string;
  slug: string;
  coverImageUrl: string;
}

// TODO: Blog page will eventually need a 'template' layout
//  - Need to have paragraphs associated with images
//  - Need to easily customize the layout, would love a drag and drop