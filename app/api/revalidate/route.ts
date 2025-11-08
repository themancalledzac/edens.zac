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
    const { tag, path } = body;

    if (!tag && !path) {
      return NextResponse.json(
        { error: 'Either tag or path is required' },
        { status: 400 }
      );
    }

    // Revalidate cache tag if provided
    if (tag && typeof tag === 'string') {
      revalidateTag(tag);
    }

    // Revalidate path if provided
    if (path && typeof path === 'string') {
      revalidatePath(path);
    }

    return NextResponse.json({ 
      revalidated: true, 
      tag: tag || undefined,
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

