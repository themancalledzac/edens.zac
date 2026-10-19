/**
 * Tests for SaveHeart — the corner bookmark toggle. Unlike SelectStar, the heart renders for ANY
 * logged-in viewer (not just gallery clients), gating on `useMe()` truthy AND an active
 * SavesProvider. `wrap` mounts MeProvider over a SavesProvider.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { MeProvider } from '@/app/components/Auth/MeProvider';
import { SaveHeart } from '@/app/components/Content/SaveHeart';
import { SavesProvider, useSaves } from '@/app/components/Personal/SavesContext';
import { addSave, removeSave } from '@/app/lib/api/personal';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('@/app/lib/api/personal', () => ({
  addSave: jest.fn(),
  removeSave: jest.fn(),
}));

beforeEach(() => {
  (addSave as jest.Mock).mockImplementation(() => Promise.resolve());
  (removeSave as jest.Mock).mockImplementation(() => Promise.resolve());
});

const viewer: MeResponse = {
  email: 'viewer@example.com',
  isAdmin: false,
  mfaSatisfied: false,
  passkeyCount: 0,
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

  it('renders nothing without a SavesProvider', () => {
    const { container } = render(
      <MeProvider me={viewer}>
        <SaveHeart contentId={42} />
      </MeProvider>
    );
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

describe('SaveHeart icon', () => {
  it('renders the heart glyph with the unsaved class on an unsaved image', () => {
    wrap(<SaveHeart contentId={99} />, viewer);
    const svg = screen.getByRole('button', { name: /save to your space/i }).querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg?.querySelector('path')).toHaveAttribute('d', expect.stringMatching(/^M12 21s/));
    expect(svg).toHaveClass('saveHeartIcon');
    expect(svg).not.toHaveClass('saveHeartIconActive');
  });

  it('renders the heart glyph with the saved class on a saved image', () => {
    wrap(<SaveHeart contentId={42} />, viewer);
    const svg = screen
      .getByRole('button', { name: /remove from your space/i })
      .querySelector('svg');
    expect(svg).toHaveClass('saveHeartIcon');
    expect(svg).toHaveClass('saveHeartIconActive');
  });

  it('renders through the shared corner toggle', () => {
    wrap(<SaveHeart contentId={42} />, viewer);
    expect(screen.getByRole('button', { name: /remove from your space/i })).toHaveClass(
      'cornerToggle'
    );
  });
});

describe('SaveHeart stylesheet', () => {
  const scss = readFileSync(
    path.join(process.cwd(), 'app/components/Content/SaveHeart.module.scss'),
    'utf8'
  );

  it('keeps only the glyph fill and stroke rules', () => {
    expect(scss).toMatch(/\.saveHeartIcon {[^}]*fill: none;[^}]*stroke: white;/);
    expect(scss).toMatch(/\.saveHeartIconActive {[^}]*fill: var\(--color-heart\);/);
    expect(scss).not.toContain('position: absolute');
    expect(scss).not.toContain('pointer: coarse');
  });
});
