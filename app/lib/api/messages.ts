import { fetchAdminGetApi } from './core';

export interface AdminMessageView {
  id: number;
  email: string;
  message: string;
  createdAt: string;
}

export interface AdminMessageList {
  messages: AdminMessageView[];
  total: number;
  limit: number;
  offset: number;
}

export async function getAdminMessages(limit = 50, offset = 0): Promise<AdminMessageList | null> {
  return fetchAdminGetApi<AdminMessageList>(`/messages?limit=${limit}&offset=${offset}`, {
    cache: 'no-store',
  });
}
