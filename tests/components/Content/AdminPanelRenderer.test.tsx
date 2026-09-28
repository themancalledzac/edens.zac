import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { AdminPanelRenderer } from '@/app/components/Content/AdminPanelRenderer';
import {
  AdminPanelCollapseProvider,
  type AdminPanelCollapseValue,
} from '@/app/components/ListPanel/AdminPanelCollapseContext';
import type { ContentPanelModel } from '@/app/types/Content';

interface AdminListsProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

jest.mock('@/app/components/AdminLists/AdminLists', () => ({
  AdminLists: ({ collapsed, onCollapsedChange }: AdminListsProps) => (
    <div>
      AdminLists
      <span data-testid="collapsed">{String(collapsed)}</span>
      <button type="button" onClick={() => onCollapsedChange?.(true)}>
        collapse
      </button>
    </div>
  ),
}));

const baseContent: ContentPanelModel = {
  id: 1,
  contentType: 'PANEL',
  orderIndex: 0,
  rating: 5,
};

describe('AdminPanelRenderer', () => {
  it('renders the tabbed admin lists', () => {
    render(<AdminPanelRenderer content={baseContent} width={800} height={600} />);
    expect(screen.getByText('AdminLists')).toBeInTheDocument();
  });

  /**
   * The packer's height is the panel's TRUE content height now (`chrome + rowCount × rowHeight`),
   * so the box occupies exactly what it reserved. The previous contract — height applied as a
   * `max-height` so the box could render shorter than its reservation — is the bug, not the
   * feature: claiming a tall column and rendering short is what left the blank well in Zac's
   * 2026-08-10 screenshots (763px reserved against 249px rendered).
   */
  it('occupies exactly the box the packer reserved, height included', () => {
    const { container } = render(
      <AdminPanelRenderer content={baseContent} width={400} height={300} />
    );
    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({ width: '400px', height: '300px' });
  });

  it('never caps with max-height — a cap is how a box under-fills its reservation', () => {
    const { container } = render(
      <AdminPanelRenderer content={baseContent} width={400} height={300} />
    );
    const box = container.firstChild as HTMLElement;
    expect(box.style.maxHeight).toBe('');
  });

  /**
   * A panel is an ordinary leaf of the content layout, so it carries the same atomic position class
   * a photograph gets at the same slot instead of styling a parallel box of its own.
   */
  it('wears the atomic position class the layout hands it', () => {
    const { container } = render(
      <AdminPanelRenderer
        content={baseContent}
        width={400}
        height={300}
        positionClassName="imageSingle"
      />
    );
    expect(container.firstChild).toHaveClass('imageSingle');
  });

  function collapseValue(
    overrides: Partial<AdminPanelCollapseValue> = {}
  ): AdminPanelCollapseValue {
    return { collapsed: false, setCollapsed: jest.fn(), ...overrides };
  }

  it('renders a non-collapsible panel with no provider', () => {
    render(<AdminPanelRenderer content={baseContent} width={400} height={300} />);
    expect(screen.getByTestId('collapsed')).toHaveTextContent('undefined');
  });

  it('reports the provider collapsed state to the panel', () => {
    render(
      <AdminPanelCollapseProvider value={collapseValue({ collapsed: true })}>
        <AdminPanelRenderer content={baseContent} width={400} height={300} />
      </AdminPanelCollapseProvider>
    );
    expect(screen.getByTestId('collapsed')).toHaveTextContent('true');
  });

  it('routes a collapse request to the provider', () => {
    const setCollapsed = jest.fn();
    render(
      <AdminPanelCollapseProvider value={collapseValue({ setCollapsed })}>
        <AdminPanelRenderer content={baseContent} width={400} height={300} />
      </AdminPanelCollapseProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'collapse' }));
    expect(setCollapsed).toHaveBeenCalledWith(true);
  });

  /**
   * Collapsed takes the identical path — the bar occupies exactly the height it is handed, with no
   * special-casing left in this component. The 56 below is an arbitrary bar-ish number chosen to
   * show that this component does not know or care what the pin is; the shipped footprint pins
   * `COLLAPSED_PANEL_HEIGHT` (102px), and `page.collapsedLayout.test.ts` is what asserts THAT
   * number reaches the row. The old code had to strip its cap here, because a `max-height` below
   * the header's natural height clipped the bar to a sliver on narrow viewports; the height it is
   * given is now simply correct at every width.
   */
  it('renders a collapsed bar at the pinned height, by the same rule as an expanded panel', () => {
    const { container } = render(
      <AdminPanelCollapseProvider value={collapseValue({ collapsed: true })}>
        <AdminPanelRenderer content={baseContent} width={400} height={56} />
      </AdminPanelCollapseProvider>
    );
    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({ width: '400px', height: '56px' });
    expect(box.style.maxHeight).toBe('');
  });
});
