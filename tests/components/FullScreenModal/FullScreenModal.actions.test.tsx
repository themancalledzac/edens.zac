/**
 * The fullscreen viewer's top-left action row: download, Selects star and Save heart. Each action
 * self-gates on its own provider and principal, so these tests mount the viewer inside MeProvider,
 * SelectsProvider and SavesProvider and check which buttons appear.
 */
import { render, screen } from '@testing-library/react';
import { type ComponentProps, type ReactNode } from 'react';

import { MeProvider } from '@/app/components/Auth/MeProvider';
import { SelectsProvider } from '@/app/components/ContentCollection/SelectsContext';
import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import { SavesProvider } from '@/app/components/Personal/SavesContext';
import { type MeResponse } from '@/app/types/Auth';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

jest.mock('@/app/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: jest.fn() }));
jest.mock('@/app/lib/api/selects', () => ({ addSelect: jest.fn(), removeSelect: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({ addSave: jest.fn(), removeSave: jest.fn() }));

const image = {
  id: 7,
  contentType: 'IMAGE',
  imageUrl: 'https://cdn.example/7.jpg',
  imageWidth: 1000,
  imageHeight: 800,
  orderIndex: 0,
  visible: true,
  title: 'Image 7',
  locations: [],
} as unknown as ContentImageModel;

const gif = {
  id: 8,
  contentType: 'GIF',
  gifUrl: 'https://cdn.example/8.mp4',
  orderIndex: 0,
  visible: true,
  title: 'Gif 8',
} as unknown as ContentGifModel;

const client: MeResponse = {
  email: 'client@example.com',
  isAdmin: false,
  mfaSatisfied: false,
  passkeyCount: 0,
  galleries: [{ collectionId: 3, role: 'CLIENT' }],
};

const noop = () => {};

function renderViewer(
  me: MeResponse | null,
  props: Partial<ComponentProps<typeof FullScreenModal>> = {},
  current: ContentImageModel | ContentGifModel = image
) {
  const providers = (ui: ReactNode) => (
    <MeProvider me={me}>
      <SavesProvider initialSavedIds={[]}>
        <SelectsProvider collectionId={3} initialSelectedIds={[]}>
          {ui}
        </SelectsProvider>
      </SavesProvider>
    </MeProvider>
  );
  return render(
    providers(
      <FullScreenModal
        fullScreenState={{ images: [current], currentIndex: 0 }}
        loadedImageIds={new Set<number>([current.id])}
        setLoadedImageIds={noop}
        modalRef={{ current: null }}
        zoomTargetRef={{ current: null }}
        isZoomed={false}
        hideImage={noop}
        isSwiping={{ current: false }}
        showMetadata={false}
        toggleMetadata={noop}
        navigateToNext={noop}
        navigateToPrevious={noop}
        {...props}
      />
    )
  );
}

describe('FullScreenModal — action row', () => {
  it('shows the star and heart for a client of the gallery', () => {
    renderViewer(client);
    const star = screen.getByRole('button', { name: 'Add to Your Selects' });
    const heart = screen.getByRole('button', { name: 'Save to Your Space' });
    expect(star.parentElement).toHaveClass('viewerActions');
    expect(heart.parentElement).toBe(star.parentElement);
  });

  it('shows neither to an anonymous viewer', () => {
    renderViewer(null);
    expect(screen.queryByRole('button', { name: /your selects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /your space/i })).not.toBeInTheDocument();
  });

  it('hides the row in immersive mode', () => {
    renderViewer(client, { immersive: true });
    expect(screen.queryByRole('button', { name: /your selects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /your space/i })).not.toBeInTheDocument();
  });

  it('hides the row on a GIF', () => {
    renderViewer(client, {}, gif);
    expect(screen.queryByRole('button', { name: /your selects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /your space/i })).not.toBeInTheDocument();
  });
});
