export interface HomeCardModel {
    id: number;
    title: string;
    cardType: 'catalog' | 'blog';
    location?: string;
    date?: string;
    priority: number;
    coverImageUrl: string;
    slug: string;
    text?: string;
}