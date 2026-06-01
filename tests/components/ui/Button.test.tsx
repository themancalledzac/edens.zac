import { fireEvent, render, screen } from '@testing-library/react';

import { Button } from '@/app/components/ui/Button/Button';

describe('Button', () => {
  it('renders children and defaults to type="button"', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="danger" size="sm">
        Delete
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/danger/);
    expect(btn.className).toMatch(/sm/);
  });

  it('supports the outline variant', () => {
    render(<Button variant="outline">More</Button>);
    expect(screen.getByRole('button', { name: 'More' }).className).toMatch(/outline/);
  });

  it('is disabled and aria-busy while loading', () => {
    render(<Button loading>Saving</Button>);
    const btn = screen.getByRole('button', { name: /saving/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('forwards onClick', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects an explicit type and merges a custom className', () => {
    render(
      <Button type="submit" className="custom-x">
        Submit
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Submit' });
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn.className).toMatch(/custom-x/);
  });
});
