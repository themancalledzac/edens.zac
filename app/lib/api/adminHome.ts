import { fetchAdminGetApi } from './core';

export interface AdminHomeTileApi {
  tileKey: string;
  coverImageUrl: string | null;
  displayOrder: number;
}

export async function getAdminHomeTiles(): Promise<AdminHomeTileApi[]> {
  const tiles = await fetchAdminGetApi<AdminHomeTileApi[]>('/admin-home/tiles', {
    cache: 'no-store',
  });
  return tiles ?? [];
}
