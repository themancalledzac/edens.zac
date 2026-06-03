import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import Component from '@/app/components/Content/Component';
import { type AnyContentModel } from '@/app/types/Content';

const measured = { contentWidth: 0, viewportHeight: 0, isMobile: false, width: 0 };
jest.mock('@/app/hooks/useViewport', () => ({
  useViewport: () => measured,
}));

jest.mock('@/app/components/Content/CollectionContentRenderer', () => ({
  __esModule: true,
  default: ({ contentId }: { contentId: number }) => (
    <div data-testid={`item-${contentId}`} data-renderer="stub" />
  ),
}));

function makeImage(id: number): AnyContentModel {
  return {
    contentType: 'IMAGE',
    id,
    title: `image-${id}`,
    orderIndex: id,
    visible: true,
    imageUrl: `https://example.test/${id}.jpg`,
    imageWidth: 1200,
    imageHeight: 800,
    width: 1200,
    height: 800,
    locations: [],
  } as unknown as AnyContentModel;
}

describe('Component — SSR fallback viewport', () => {
  afterEach(() => {
    measured.contentWidth = 0;
    measured.viewportHeight = 0;
    measured.isMobile = false;
    measured.width = 0;
  });

  it('renders the row grid when measured viewport is zero but ssrViewport is provided', () => {
    const content = [makeImage(1), makeImage(2), makeImage(3), makeImage(4)];

    render(
      <Component
        content={content}
        serverContentWidth={1274}
        serverViewportHeight={800}
        serverIsMobile={false}
      />
    );

    expect(screen.queryByTestId('layout-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-4')).toBeInTheDocument();
  });

  it('renders the measuring skeleton when neither measured viewport nor ssrViewport is available', () => {
    const content = [makeImage(1), makeImage(2)];

    render(<Component content={content} />);

    expect(screen.getByTestId('layout-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
  });

  it('honors measured viewport over ssrViewport once the client has measured', () => {
    measured.contentWidth = 1274;
    measured.viewportHeight = 800;
    measured.isMobile = false;
    measured.width = 1280;

    const content = [makeImage(1), makeImage(2)];

    render(
      <Component
        content={content}
        serverContentWidth={390}
        serverViewportHeight={844}
        serverIsMobile
      />
    );

    expect(screen.queryByTestId('layout-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
  });
});
