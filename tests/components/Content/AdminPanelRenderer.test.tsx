import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import {
  AdminPanelCollapseProvider,
  type AdminPanelCollapseValue,
} from '@/app/components/AdminPanel/AdminPanelCollapseContext';
import { AdminPanelRenderer } from '@/app/components/Content/AdminPanelRenderer';
import type { ContentPanelModel } from '@/app/types/Content';

interface PanelProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function panelStub(label: string) {
  return function Stub({ collapsed, onCollapsedChange }: PanelProps) {
    return (
      <div>
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

const baseContent: ContentPanelModel = {
  id: 1,
  contentType: 'PANEL',
  orderIndex: 0,
  panelType: 'users',
  rating: 5,
};

describe('AdminPanelRenderer', () => {
  it('renders UserManagementPanel for panelType "users"', () => {
    render(<AdminPanelRenderer content={baseContent} width={800} height={600} />);
    expect(screen.getByText('UserManagementPanel')).toBeInTheDocument();
  });

  it('renders MessagesPanel for panelType "messages"', () => {
    render(
      <AdminPanelRenderer
        content={{ ...baseContent, panelType: 'messages' }}
        width={800}
        height={600}
      />
    );
    expect(screen.getByText('MessagesPanel')).toBeInTheDocument();
  });

  it('renders RolesPanel for panelType "roles"', () => {
    render(
      <AdminPanelRenderer
        content={{ ...baseContent, panelType: 'roles' }}
        width={800}
        height={600}
      />
    );
    expect(screen.getByText('RolesPanel')).toBeInTheDocument();
  });

  it('applies the packer height as a max-height, so a panel can be shorter than its box', () => {
    const { container } = render(
      <AdminPanelRenderer content={baseContent} width={400} height={300} />
    );
    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({ width: '400px', maxHeight: '300px' });
  });

  it('never sets a fixed height, which would defeat the content-driven sizing', () => {
    const { container } = render(
      <AdminPanelRenderer content={baseContent} width={400} height={300} />
    );
    const box = container.firstChild as HTMLElement;
    expect(box.style.height).toBe('');
  });

  function collapseValue(
    overrides: Partial<AdminPanelCollapseValue> = {}
  ): AdminPanelCollapseValue {
    return { isCollapsed: () => false, setCollapsed: jest.fn(), ...overrides };
  }

  it('renders a non-collapsible panel with no provider', () => {
    render(<AdminPanelRenderer content={baseContent} width={400} height={300} />);
    expect(screen.getByTestId('UserManagementPanel-collapsed')).toHaveTextContent('undefined');
  });

  it('reports the provider collapsed state to the panel', () => {
    render(
      <AdminPanelCollapseProvider value={collapseValue({ isCollapsed: () => true })}>
        <AdminPanelRenderer content={baseContent} width={400} height={300} />
      </AdminPanelCollapseProvider>
    );
    expect(screen.getByTestId('UserManagementPanel-collapsed')).toHaveTextContent('true');
  });

  it('routes a collapse request to the provider, keyed by panel type', () => {
    const setCollapsed = jest.fn();
    render(
      <AdminPanelCollapseProvider value={collapseValue({ setCollapsed })}>
        <AdminPanelRenderer
          content={{ ...baseContent, panelType: 'roles' }}
          width={400}
          height={300}
        />
      </AdminPanelCollapseProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'collapse RolesPanel' }));
    expect(setCollapsed).toHaveBeenCalledWith('roles', true);
  });

  it('drops the max-height cap while collapsed, since the packer footprint resolves below the header', () => {
    const { container } = render(
      <AdminPanelCollapseProvider value={collapseValue({ isCollapsed: () => true })}>
        <AdminPanelRenderer content={baseContent} width={400} height={300} />
      </AdminPanelCollapseProvider>
    );
    const box = container.firstChild as HTMLElement;
    expect(box.style.maxHeight).toBe('');
  });
});
