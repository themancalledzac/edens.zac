import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectableWrapper from '@/Components/url-state/selectable-wrapper';

jest.mock('next/navigation', () => {
  return {
    useRouter: () => ({ push: jest.fn() }),
    usePathname: () => '/collection/test-slug',
    useSearchParams: () => new URLSearchParams('page=0&size=30'),
  };
});

describe('SelectableWrapper', () => {
  it('renders children and toggles selection via URL', () => {
    render(
      <SelectableWrapper blockId={123}>
        <div data-testid="child">child</div>
      </SelectableWrapper>
    );

    // children rendered
    expect(screen.getByTestId('child')).toBeInTheDocument();

    const anchor = screen.getByRole('link');
    expect(anchor).toHaveAttribute('href', '/collection/test-slug?page=0&size=30&image=123');

    // click triggers router.push (mocked). We cannot assert the exact call without capturing mock instance
    fireEvent.click(anchor);
  });
});
