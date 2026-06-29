import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { AdminPanelRenderer } from '@/app/components/Content/AdminPanelRenderer';
import type { ContentPanelModel } from '@/app/types/Content';

jest.mock('@/app/components/UserManagementPanel/UserManagementPanel', () => ({
  __esModule: true,
  default: () => <div>UserManagementPanel</div>,
}));

jest.mock('@/app/components/MessagesPanel/MessagesPanel', () => ({
  MessagesPanel: () => <div>MessagesPanel</div>,
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

  it('applies width and height as inline styles', () => {
    const { container } = render(
      <AdminPanelRenderer content={baseContent} width={400} height={300} />
    );
    const box = container.firstChild as HTMLElement;
    expect(box).toHaveStyle({ width: '400px', height: '300px' });
  });
});
