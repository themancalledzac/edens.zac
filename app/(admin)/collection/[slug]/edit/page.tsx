import { EditLiteProvider } from "@/context/edit-lite-context";

import EditCollectionClient from './EditCollectionClient';

/**
 * Edit Collection Page
 *
 * Server component wrapper that handles async params and passes them to the client component.
 * This pattern allows us to handle Next.js 15 async params while maintaining client-side functionality.
 *
 * @param params - Route parameters containing collection slug (async in Next.js 15)
 * @returns Server component that renders client component with awaited params
 */
export default async function EditCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <EditLiteProvider>
      <EditCollectionClient slug={slug} />
    </EditLiteProvider>
  );
}