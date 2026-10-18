import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { FullScreenModalBoundary } from '@/app/components/Content/FullScreenModalBoundary';

function Thrower(): never {
  throw new Error('chunk failed');
}

describe('FullScreenModalBoundary', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders its children when nothing throws', () => {
    render(
      <FullScreenModalBoundary>
        <p>modal</p>
      </FullScreenModalBoundary>
    );

    expect(screen.getByText('modal')).toBeInTheDocument();
  });

  it('keeps a sibling rendered and renders nothing when a child throws', () => {
    const { container } = render(
      <div>
        <p>grid</p>
        <div data-testid="slot">
          <FullScreenModalBoundary>
            <Thrower />
          </FullScreenModalBoundary>
        </div>
      </div>
    );

    expect(screen.getByText('grid')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toBeEmptyDOMElement();
    expect(container).toBeInTheDocument();
  });
});
