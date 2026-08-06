import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { Card } from '@/app/components/ui/Card/Card';

describe('Card', () => {
  it('renders its title and children', () => {
    render(<Card title="Account">body content</Card>);
    expect(screen.getByRole('heading', { name: 'Account', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  /**
   * The reason the shell is shared rather than copy-pasted. Several of the thirteen hand-rolled
   * "section with a heading" implementations used a bare <div>, so the region was announced as an
   * unnamed landmark or not at all. Wiring aria-labelledby here fixes every adopter at once.
   */
  it('names the region with its heading', () => {
    render(<Card title="Admin">links</Card>);
    const region = screen.getByRole('region', { name: 'Admin' });
    const heading = screen.getByRole('heading', { name: 'Admin' });
    expect(region).toContainElement(heading);
    expect(region.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('generates a unique heading id per instance so two cards do not collide', () => {
    render(
      <>
        <Card title="Account">a</Card>
        <Card title="Admin">b</Card>
      </>
    );
    const ids = screen.getAllByRole('heading').map(h => h.id);
    expect(ids).toHaveLength(2);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Cards nested under an existing h2 need h3, or the document outline skips a level.
  it('drops to h3 on request, keeping the region named', () => {
    render(
      <Card title="Roles" as="h3">
        body
      </Card>
    );
    expect(screen.getByRole('heading', { name: 'Roles', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Roles' })).toBeInTheDocument();
  });

  it('renders an action alongside the title', () => {
    render(
      <Card title="Users" action={<button type="button">+ New</button>}>
        body
      </Card>
    );
    expect(screen.getByRole('button', { name: '+ New' })).toBeInTheDocument();
  });
});
