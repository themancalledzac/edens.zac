import { revalidatePath, revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Revalidate Collection Cache
 * 
 * Route handler to revalidate Next.js cache tags and paths for collections.
 * Called after image updates to ensure collection pages show fresh data.
 * 
 * POST /api/revalidate
 * Body: { tag?: string, path?: string } - Cache tag and/or path to revalidate
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tag, tags, path } = body;

    if (!tag && !tags && !path) {
      return NextResponse.json(
        { error: 'Either tag, tags, or path is required' },
        { status: 400 }
      );
    }

    // Revalidate single cache tag if provided
    if (tag && typeof tag === 'string') {
      revalidateTag(tag, 'default');
    }

    // Revalidate multiple cache tags if provided
    if (Array.isArray(tags)) {
      for (const t of tags) {
        if (typeof t === 'string') {
          revalidateTag(t, 'default');
        }
      }
    }

    // Revalidate path if provided
    if (path && typeof path === 'string') {
      revalidatePath(path);
    }

    return NextResponse.json({
      revalidated: true,
      tag: tag || undefined,
      tags: tags || undefined,
      path: path || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to revalidate cache', detail: message },
      { status: 500 }
    );
  }
}
