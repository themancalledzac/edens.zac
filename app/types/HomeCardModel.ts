import { type CollectionType } from './ContentCollection';

export interface HomeCardModel {
  id: number;
  title: string;
  cardType: CollectionType;
  location?: string;
  date?: string;
  priority: number;
  coverImageUrl: string;
  slug: string;
  text?: string;
}