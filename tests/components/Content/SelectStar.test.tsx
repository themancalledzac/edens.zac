/**
 * Tests for SelectStar — the corner favorites toggle. The star self-gates on `canSelect`
 * (admin or a gallery grant for the provider's collection) AND an active SelectsProvider,
 * reading both `useMe()` and `useSelects()` directly. `wrap` mounts MeProvider over a
 * SelectsProvider; the client principal holds a grant on collection 3.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import { SelectStar } from '@/app/components/Content/SelectStar';
import { SelectsProvider, useSelects } from '@/app/components/ContentCollection/SelectsContext';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('@/app/lib/api/selects', () => ({
  addSelect: jest.fn().mockResolvedValue(),
  removeSelect: jest.fn().mockResolvedValue(),
}));

const client: MeResponse = {
  email: 'client@example.com',
  role: 'CLIENT',
  mfaSatisfied: false,
  galleries: [{ collectionId: 3, canDownload: true, canTag: false }],
};

function wrap(ui: ReactNode, me: MeResponse | null, collectionId = 3) {
  return render(
    <MeProvider me={me}>
      <SelectsProvider collectionId={collectionId} initialSelectedIds={[42]}>
        {ui}
      </SelectsProvider>
    </MeProvider>
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('SelectStar', () => {
  it('renders nothing for an anonymous viewer', () => {
    const { container } = wrap(<SelectStar contentId={42} />, null);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a client without a grant on this collection', () => {
    // Provider scoped to collection 999, which the client has no grant for.
    const { container } = wrap(<SelectStar contentId={42} />, client, 999);
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders a pressed star for a granted client on a selected image', () => {
    wrap(<SelectStar contentId={42} />, client);
    const button = screen.getByRole('button', { name: /remove from your selects/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles selection on click', () => {
    function Probe() {
      const selects = useSelects();
      return <span data-testid="ids">{[...(selects?.selectedIds ?? [])].join(',')}</span>;
    }
    wrap(
      <>
        <SelectStar contentId={42} />
        <Probe />
      </>,
      client
    );
    expect(screen.getByTestId('ids')).toHaveTextContent('42');

    fireEvent.click(screen.getByRole('button', { name: /remove from your selects/i }));
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });
});
