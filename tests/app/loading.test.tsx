import '@testing-library/jest-dom';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';

import Loading from '@/app/(site)/loading';
import SearchLoading from '@/app/(site)/search/loading';
import { MAIN_CONTENT_ID } from '@/app/components/ui/SkipLink/SkipLink';

jest.mock('@/app/components/SiteHeader/SiteHeader', () => {
  const stub = () => <div data-testid="site-header" />;
  return { __esModule: true, default: stub, SiteHeader: stub };
});

jest.mock('@/app/components/ui/BottomNav/BottomNav', () => ({
  __esModule: true,
  default: () => null,
  BottomNav: () => null,
}));

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

/**
 * The fallback fills the frame by stretching: .body flexes, the skip target is stretched under
 * .fill, and no rule declares height or min-height. jest and tsc cannot see a CSS-module
 * regression, so this reads the stylesheet source and asserts its declarations. The twins run
 * the checker over a regressed copy and assert the regression is reported.
 */
const SOURCE = join(process.cwd(), 'app/components/ui/PageLoading/PageLoading.module.scss');

function source(): string {
  return readFileSync(SOURCE, 'utf8');
}

function block(scss: string, selector: string): string {
  const start = scss.indexOf(selector + ' {');
  if (start === -1) return '';
  return scss.slice(start, scss.indexOf('}', start));
}

function violations(scss: string): string[] {
  const found: string[] = [];
  if (!/flex:\s*1;/.test(block(scss, '.body'))) found.push('.body must flex: 1');
  const target = block(scss, '> #main-content');
  if (!/flex:\s*1;/.test(target) || !/display:\s*flex;/.test(target)) {
    found.push('the skip target must be a stretched flex column under .fill');
  }
  if (/(^|[\s;{])(min-|max-)?height\s*:/.test(scss)) {
    found.push('no rule may declare height or min-height');
  }
  return found;
}

describe('loading fallback stylesheet', () => {
  it('stretches to fill the frame with no height of its own', () => {
    expect(violations(source())).toEqual([]);
  });

  it('reports a min-height added back', () => {
    const regressed = source().replace('.body {', '.body {\n  min-height: 60vh;');
    expect(violations(regressed)).toContain('no rule may declare height or min-height');
  });

  it('reports a body that no longer flexes', () => {
    const regressed = source().replace(/(\.body {[^}]*?)flex: 1/, '$1flex: none');
    expect(violations(regressed)).toContain('.body must flex: 1');
  });

  it('reports a skip target that is no longer stretched', () => {
    const regressed = source().replace(/(#main-content {[^}]*?)flex: 1/, '$1flex: none');
    expect(violations(regressed)).toHaveLength(1);
  });
});
