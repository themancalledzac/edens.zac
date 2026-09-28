import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { AdminHubClient } from '@/app/(admin)/admin/AdminHubClient';
import { buildAdminHubContent, COLLAPSED_PANEL_SIZE } from '@/app/(admin)/admin/adminHubContent';

/**
 * `page.collapsedLayout.test.ts` proves `withPanelFootprints` plus the real packer produce the
 * right rows, but it drives that pure function directly and never mounts `AdminHubClient` itself —
 * so nothing exercised the component's own `useState`/`useMemo` wiring: the `setCollapsed`
 * same-value bail-out, or the dependency arrays that make a real collapse toggle re-derive
 * `laidOutContent`. This fires an actual click through the real component tree and asserts the
 * DOM the packer produced changed shape, not just that a class toggled.
 */

/** The real max desktop content width (pageMaxWidth 1300 − desktopPadding 25.6). */
const DESKTOP_VIEWPORT = { contentWidth: 1274.4, viewportHeight: 900, isMobile: false };

/**
 * Pinned at all-zero so `resolveEffectiveViewport` (inside `Component`) never treats jsdom's
 * default window size as "measured" and falls through cleanly to the `server*` props below —
 * same pattern as `tests/components/Content/Component.ssrFallback.test.tsx`.
 */
const measured = { contentWidth: 0, viewportHeight: 0, isMobile: false, width: 0 };
jest.mock('@/app/hooks/useViewport', () => ({
  useViewport: () => measured,
}));

jest.mock('@/app/hooks/useParallax', () => ({
  useParallax: () => ({ current: null }),
}));

/**
 * `ContentBlockWithFullScreen` dynamically imports `FullScreenModal` and mounts it once `mounted`
 * flips true post-mount, regardless of `enableFullScreenView`. Left real, its async resolution
 * lands outside the click's `act()` and logs a spurious "not wrapped in act" warning — same stub
 * `tests/components/Content/ContentBlockWithFullScreen.test.tsx` uses.
 */
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin',
}));

interface PanelStubProps {
  shell?: { collapsed?: boolean; onCollapsedChange?: (collapsed: boolean) => void };
}

function panelStub(label: string) {
  return function Stub({ shell }: PanelStubProps) {
    return (
      <div data-testid={`${label}-stub`}>
        {label}
        <span data-testid={`${label}-collapsed`}>{String(shell?.collapsed)}</span>
        <button type="button" onClick={() => shell?.onCollapsedChange?.(true)}>
          {`collapse ${label}`}
        </button>
      </div>
    );
  };
}

jest.mock('@/app/components/UserManagementPanel/UserManagementPanel', () => ({
  __esModule: true,
  default: panelStub('UserManagementPanel'),
}));

jest.mock('@/app/components/MessagesPanel/MessagesPanel', () => ({
  MessagesPanel: panelStub('MessagesPanel'),
}));

jest.mock('@/app/components/RolesPanel/RolesPanel', () => ({
  RolesPanel: panelStub('RolesPanel'),
}));

jest.mock('@/app/components/CollectionsPanel/CollectionsPanel', () => ({
  CollectionsPanel: panelStub('CollectionsPanel'),
}));

/** The `AdminPanelRenderer` box wrapping the stubbed active tab — where `width`/`height` land. */
function panelBox(label: string): HTMLElement {
  const stub = screen.getByTestId(`${label}-stub`);
  const box = stub.parentElement;
  if (!box) throw new Error(`${label} stub has no parent box`);
  return box;
}

describe('AdminHubClient', () => {
  it('re-packs the real layout when a real collapse toggle fires', () => {
    render(
      <AdminHubClient
        content={buildAdminHubContent([])}
        mobileChunkSize={1}
        serverContentWidth={DESKTOP_VIEWPORT.contentWidth}
        serverViewportHeight={DESKTOP_VIEWPORT.viewportHeight}
        serverIsMobile={DESKTOP_VIEWPORT.isMobile}
      />
    );

    // Only the active tab is mounted: Users, the default.
    expect(screen.queryByTestId('RolesPanel-stub')).not.toBeInTheDocument();
    const heightBefore = Number.parseFloat(panelBox('UserManagementPanel').style.height);

    fireEvent.click(screen.getByRole('button', { name: 'collapse UserManagementPanel' }));

    const boxAfter = panelBox('UserManagementPanel');
    const widthAfter = Number.parseFloat(boxAfter.style.width);
    const heightAfter = Number.parseFloat(boxAfter.style.height);

    // A real re-pack, not a local restyle: the box the packer hands the panel drops to the bar.
    expect(heightAfter).toBe(COLLAPSED_PANEL_SIZE.minHeight);
    expect(heightAfter).toBeLessThan(heightBefore);
    expect(widthAfter).toBeGreaterThanOrEqual(COLLAPSED_PANEL_SIZE.minWidth);
    expect(boxAfter.style.maxHeight).toBe('');

    expect(screen.getByTestId('UserManagementPanel-collapsed')).toHaveTextContent('true');
  });
});
