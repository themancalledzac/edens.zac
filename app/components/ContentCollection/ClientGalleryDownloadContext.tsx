'use client';

import { createContext, useContext } from 'react';

/**
 * Page-level select/download state for CLIENT_GALLERY pages.
 *
 * The `ClientGalleryDownload` control is rendered deep inside the content tree (in the collection's
 * TEXT/metadata block), but the selection state it drives — and the `onImageClick` toggle wired to
 * the grid images — is owned by `CollectionPageClient`. This context bridges the two without
 * prop-drilling through the generic Component/BoxRenderer/CollectionContentRenderer chain, mirroring
 * how `CollectionFilterContext` feeds the FilterToolbar in the same TEXT block.
 */
export interface ClientGalleryDownloadContextValue {
  /** True when the user is picking a subset of images to download. */
  isSelectMode: boolean;
  /** Currently selected image ids. */
  selectedImageIds: number[];
  /** Enter select mode (tapping an image now toggles selection instead of opening fullscreen). */
  enterSelectMode: () => void;
  /** Leave select mode and clear the current selection. */
  exitSelectMode: () => void;
}

const ClientGalleryDownloadContext = createContext<ClientGalleryDownloadContextValue | null>(null);

export function ClientGalleryDownloadProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ClientGalleryDownloadContextValue;
}) {
  return (
    <ClientGalleryDownloadContext.Provider value={value}>
      {children}
    </ClientGalleryDownloadContext.Provider>
  );
}

/** Returns the download/select state, or null when rendered outside a client gallery. */
export function useClientGalleryDownload(): ClientGalleryDownloadContextValue | null {
  return useContext(ClientGalleryDownloadContext);
}
