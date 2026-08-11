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

/**
 * The real max desktop content width (pageMaxWidth 1300 − desktopPadding 25.6). Each panel
 * declares a 400px {@link Content.minWidth}, and three share a row only at or above a measured
 * 1232.0px of content width (NOT 3×400 + 2×gap = 1225.6 — membership is decided from the packer's
 * share estimate, which is stricter than the rendered width; see `adminHubContent.ts`). Below that
 * the packer legitimately splits them and this test's "collapsing one widens the rest" premise
 * stops being about collapsing at all. `page.collapsedLayout.test.ts` pins the narrow case.
 */
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
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function panelStub(label: string) {
  return function Stub({ collapsed, onCollapsedChange }: PanelStubProps) {
    return (
      <div data-testid={`${label}-stub`}>
        {label}
        <span data-testid={`${label}-collapsed`}>{String(collapsed)}</span>
        <button type="button" onClick={() => onCollapsedChange?.(true)}>
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

/** The `AdminPanelRenderer` box wrapping a stubbed panel — where `width`/`maxHeight` land. */
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

    const usersWidthBefore = Number.parseFloat(panelBox('UserManagementPanel').style.width);
    const usersHeightBefore = Number.parseFloat(panelBox('UserManagementPanel').style.height);
    const rolesHeightBefore = Number.parseFloat(panelBox('RolesPanel').style.height);

    expect(usersWidthBefore).toBeLessThan(1000);

    fireEvent.click(screen.getByRole('button', { name: 'collapse UserManagementPanel' }));

    const usersBoxAfter = panelBox('UserManagementPanel');
    const usersWidthAfter = Number.parseFloat(usersBoxAfter.style.width);
    const usersHeightAfter = Number.parseFloat(usersBoxAfter.style.height);
    const rolesHeightAfter = Number.parseFloat(panelBox('RolesPanel').style.height);

    expect(usersWidthAfter).toBeGreaterThanOrEqual(COLLAPSED_PANEL_SIZE.minWidth);
    expect(usersBoxAfter.style.maxHeight).toBe('');

    // The collapse is a real re-pack, not a local restyle: Users drops to the bar height while
    // Roles — untouched by the click — keeps the height its own row count dictates. Height is the
    // honest signal now; the old assertion here was "roles gets WIDER", which the composer
    // invalidated once it could reclaim freed space by pulling more items into the row instead.
    expect(usersHeightAfter).toBe(COLLAPSED_PANEL_SIZE.minHeight);
    expect(usersHeightAfter).toBeLessThan(usersHeightBefore);
    expect(rolesHeightAfter).toBe(rolesHeightBefore);

    expect(screen.getByTestId('UserManagementPanel-collapsed')).toHaveTextContent('true');
  });
});
