import { fireEvent, render, screen } from '@testing-library/react';

import { Tile } from '@/app/components/ui/Tile/Tile';

describe('Tile', () => {
  it('renders a real anchor with the href and contains its children', () => {
    render(
      <Tile href="/landscapes" aria-label="Landscapes">
        <span>cover</span>
      </Tile>
    );
    const link = screen.getByRole('link', { name: 'Landscapes' });
    expect(link).toHaveAttribute('href', '/landscapes');
    expect(link).toContainHTML('<span>cover</span>');
  });

  it('forwards onClick (used for fullscreen-open, not navigation)', () => {
    const onClick = jest.fn();
    render(
      <Tile href="/landscapes" aria-label="Landscapes" onClick={onClick}>
        cover
      </Tile>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Landscapes' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('passes through inline style and data attributes for parallax wiring', () => {
    render(
      <Tile href="/x" aria-label="X" style={{ width: 300 }} data-parallax-container="">
        cover
      </Tile>
    );
    const link = screen.getByRole('link', { name: 'X' });
    expect(link).toHaveStyle({ width: '300px' });
    expect(link).toHaveAttribute('data-parallax-container');
  });
});
