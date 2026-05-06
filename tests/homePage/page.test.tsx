import { render, screen } from '@testing-library/react';

import HomePagePreview from '@/app/homePage/page';

jest.mock('@/app/lib/components/CollectionPageWrapper', () => ({
  __esModule: true,
  default: ({ slug }: { slug: string }) => <div data-testid="wrapper">slug={slug}</div>,
}));

describe('HomePagePreview (/homePage)', () => {
  it('renders CollectionPageWrapper with slug="home"', async () => {
    const ui = await HomePagePreview();
    render(ui);
    expect(screen.getByTestId('wrapper')).toHaveTextContent('slug=home');
  });
});
