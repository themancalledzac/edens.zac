import '@testing-library/jest-dom';

import { render } from '@testing-library/react';

import { BoxRenderer } from '@/app/components/Content/BoxRenderer';
import type { ContentBlankModel } from '@/app/types/Content';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

jest.mock('@/app/components/Content/CollectionContentRenderer', () => ({
  __esModule: true,
  default: () => <div data-testid="real-content" />,
}));

describe('BoxRenderer leaf branches', () => {
  it('renders a blank leaf as an aria-hidden spacer at the allocated size', () => {
    const blank: ContentBlankModel = {
      id: -1,
      contentType: 'BLANK',
      orderIndex: 0,
      width: 320,
      height: 180,
    };
    const sizes = new Map([[blank.id, { width: 320, height: 180 }]]);
    const { container } = render(
      <BoxRenderer tree={{ type: 'leaf', content: blank }} sizes={sizes} isMobile={false} />
    );
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveAttribute('aria-hidden');
    expect(spacer).toHaveStyle({ width: '320px', height: '180px' });
  });

  it('still renders a real image leaf normally', () => {
    const image = createImageContent(1);
    const sizes = new Map([[image.id, { width: 400, height: 300 }]]);
    const { container } = render(
      <BoxRenderer tree={{ type: 'leaf', content: image }} sizes={sizes} isMobile={false} />
    );
    expect(container.querySelector('[data-testid="real-content"]')).toBeInTheDocument();
  });
});
