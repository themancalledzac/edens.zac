// import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
//
// vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
//
// import { revalidatePath, revalidateTag } from 'next/cache';
//
// import { createCollection, deleteCollection, updateCollection, uploadContentFiles } from '@/lib/server/collections';
//
// const originalEnv = process.env;
//
// describe('lib/server/collections (server-only mutations)', () => {
//   beforeEach(() => {
//     vi.restoreAllMocks();
//     global.fetch = vi.fn();
//     process.env = { ...originalEnv, NEXT_PUBLIC_API_URL: 'https://api.example.com' };
//   });
//
//   afterEach(() => {
//     process.env = originalEnv;
//   });
//
//   it('revalidates index, type, slug and path after create', async () => {
//     (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify({ id: '1', slug: 'abc', type: 'BLOG' }), { status: 200, headers: { 'content-type': 'application/json' } }));
//
//     const res = await createCollection({ title: 't', type: 'BLOG' as const });
//     expect(res.slug).toBe('abc');
//
//     expect(revalidateTag).toHaveBeenCalledWith('collections-index');
//     expect(revalidateTag).toHaveBeenCalledWith('collections-type-BLOG');
//     expect(revalidateTag).toHaveBeenCalledWith('collection-abc');
//     expect(revalidatePath).toHaveBeenCalled();
//   });
//
//   it('revalidates on update', async () => {
//     (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify({ id: '1', slug: 'abc', type: 'PORTFOLIO' }), { status: 200, headers: { 'content-type': 'application/json' } }));
//
//     await updateCollection('1', { title: 'x' });
//     expect(revalidateTag).toHaveBeenCalledWith('collections-index');
//     expect(revalidateTag).toHaveBeenCalledWith('collections-type-PORTFOLIO');
//     expect(revalidateTag).toHaveBeenCalledWith('collection-abc');
//   });
//
//   it('revalidates index on delete', async () => {
//     (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('', { status: 200, headers: { 'content-type': 'application/json' } }));
//
//     await deleteCollection('1');
//     expect(revalidateTag).toHaveBeenCalledWith('collections-index');
//   });
//
//   it('revalidates slug and type on upload', async () => {
//     (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify({ slug: 'abc', type: 'ART_GALLERY' }), { status: 200, headers: { 'content-type': 'application/json' } }));
//
//     const file = new File(['x'], 'x.txt');
//     await uploadContentFiles('1', [file]);
//
//     expect(revalidateTag).toHaveBeenCalledWith('collection-abc');
//     expect(revalidateTag).toHaveBeenCalledWith('collections-type-ART_GALLERY');
//     expect(revalidatePath).toHaveBeenCalled();
//   });
// });
