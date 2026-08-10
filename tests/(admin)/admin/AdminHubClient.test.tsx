import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { AdminHubClient } from '@/app/(admin)/admin/AdminHubClient';
import { buildAdminHubContent } from '@/app/(admin)/admin/adminHubContent';

/**
 * `page.collapsedLayout.test.ts` proves `withCollapsedPanels` plus the real packer produce the
 * right rows, but it drives that pure function directly and never mounts `AdminHubClient` itself —
 * so nothing exercised the component's own `useState`/`useMemo` wiring: the `setCollapsed`
 * same-value bail-out, or the dependency arrays that make a real collapse toggle re-derive
 * `laidOutContent`. This fires an actual click through the real component tree and asserts the
 * DOM the packer produced changed shape, not just that a class toggled.
 */

const DESKTOP_VIEWPORT = { contentWidth: 1174.4, viewportHeight: 900, isMobile: false };

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
    const rolesWidthBefore = Number.parseFloat(panelBox('RolesPanel').style.width);

    expect(usersWidthBefore).toBeLessThan(1000);

    fireEvent.click(screen.getByRole('button', { name: 'collapse UserManagementPanel' }));

    const usersBoxAfter = panelBox('UserManagementPanel');
    const usersWidthAfter = Number.parseFloat(usersBoxAfter.style.width);
    const rolesWidthAfter = Number.parseFloat(panelBox('RolesPanel').style.width);

    expect(usersWidthAfter).toBeGreaterThan(1000);
    expect(Math.round(usersWidthAfter)).toBe(Math.round(DESKTOP_VIEWPORT.contentWidth));
    expect(usersBoxAfter.style.maxHeight).toBe('');
    expect(rolesWidthAfter).toBeGreaterThan(rolesWidthBefore);

    expect(screen.getByTestId('UserManagementPanel-collapsed')).toHaveTextContent('true');
  });
});
