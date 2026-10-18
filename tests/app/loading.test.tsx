import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { MAIN_CONTENT_ID } from '@/app/components/ui/SkipLink/SkipLink';
import Loading from '@/app/loading';
import SearchLoading from '@/app/search/loading';

jest.mock('@/app/components/SiteHeader/SiteHeader', () => {
  const stub = () => <div data-testid="site-header" />;
  return { __esModule: true, default: stub, SiteHeader: stub };
});

describe.each([
  ['root', Loading],
  ['search', SearchLoading],
])('%s loading fallback', (_name, Fallback) => {
  it('emits no footer', () => {
    const { container } = render(<Fallback />);
    expect(container.querySelector('footer')).toBeNull();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('renders the shell main and the skip target', () => {
    const { container } = render(<Fallback />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(container.querySelector(`#${MAIN_CONTENT_ID}`)).toBeInTheDocument();
  });
});

describe('root loading fallback body', () => {
  it('is an aria-hidden shimmer with no spinner and no card grid', () => {
    const { container } = render(<Loading />);
    const target = container.querySelector(`#${MAIN_CONTENT_ID}`);
    const body = target?.firstElementChild;
    expect(body).toHaveAttribute('aria-hidden', 'true');
    expect(body?.children).toHaveLength(0);
    expect(target?.children).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('[role="progressbar"], svg, img, li, article')).toBeNull();
  });
});
