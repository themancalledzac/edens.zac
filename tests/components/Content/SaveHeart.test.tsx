/**
 * Tests for SaveHeart — the corner bookmark toggle. Unlike SelectStar, the heart renders for ANY
 * logged-in viewer (not just gallery clients), gating on `useMe()` truthy AND an active
 * SavesProvider. `wrap` mounts MeProvider over a SavesProvider.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import { SaveHeart } from '@/app/components/Content/SaveHeart';
import { SavesProvider, useSaves } from '@/app/components/Personal/SavesContext';
import { addSave, removeSave } from '@/app/lib/api/personal';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('@/app/lib/api/personal', () => ({
  addSave: jest.fn(),
  removeSave: jest.fn(),
}));

beforeEach(() => {
  // The toggle calls `.catch()` on the persist result, so both must return a promise.
  (addSave as jest.Mock).mockImplementation(() => Promise.resolve());
  (removeSave as jest.Mock).mockImplementation(() => Promise.resolve());
});

// Any logged-in principal — no gallery membership required for saves.
const viewer: MeResponse = {
  email: 'viewer@example.com',
  isAdmin: false,
  mfaSatisfied: false,
  galleries: [],
};

function wrap(ui: ReactNode, me: MeResponse | null, initialSavedIds: number[] = [42]) {
  return render(
    <MeProvider me={me}>
      <SavesProvider initialSavedIds={initialSavedIds}>{ui}</SavesProvider>
    </MeProvider>
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('SaveHeart', () => {
  it('renders nothing for an anonymous viewer', () => {
    const { container } = wrap(<SaveHeart contentId={42} />, null);
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders for any logged-in viewer (no gallery membership required)', () => {
    wrap(<SaveHeart contentId={42} />, viewer);
    expect(screen.getByRole('button', { name: /remove from your space/i })).toBeInTheDocument();
  });

  it('renders a pressed heart on a saved image', () => {
    wrap(<SaveHeart contentId={42} />, viewer);
    const button = screen.getByRole('button', { name: /remove from your space/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders an un-pressed heart on an unsaved image', () => {
    wrap(<SaveHeart contentId={99} />, viewer);
    const button = screen.getByRole('button', { name: /save to your space/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles the save on click', () => {
    function Probe() {
      const saves = useSaves();
      return <span data-testid="ids">{[...(saves?.savedIds ?? [])].join(',')}</span>;
    }
    wrap(
      <>
        <SaveHeart contentId={42} />
        <Probe />
      </>,
      viewer
    );
    expect(screen.getByTestId('ids')).toHaveTextContent('42');

    fireEvent.click(screen.getByRole('button', { name: /remove from your space/i }));
    expect(screen.getByTestId('ids')).toHaveTextContent('');
    expect(removeSave).toHaveBeenCalledWith(42);
  });
});
