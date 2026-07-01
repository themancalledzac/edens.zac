import { fireEvent, render, screen } from '@testing-library/react';

import { CollapsibleSection } from '@/app/components/Personal/CollapsibleSection';

describe('CollapsibleSection', () => {
  it('does not mount the body until the first expand', () => {
    render(
      <CollapsibleSection label="Images" count={2}>
        <div data-testid="body">tiles</div>
      </CollapsibleSection>
    );
    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('mounts the body immediately when defaultOpen', () => {
    render(
      <CollapsibleSection label="Collections" count={1} defaultOpen>
        <div data-testid="body">cards</div>
      </CollapsibleSection>
    );
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the body mounted after re-collapsing (hidden, not unmounted)', () => {
    render(
      <CollapsibleSection label="Saved" count={1}>
        <div data-testid="body">tiles</div>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole('button')); // open
    fireEvent.click(screen.getByRole('button')); // collapse
    // Still in the DOM (state preserved), just hidden.
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the empty label instead of children when count is 0', () => {
    render(
      <CollapsibleSection label="Following" count={0} emptyLabel="Nothing followed.">
        <div data-testid="body">cards</div>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Nothing followed.')).toBeInTheDocument();
    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
  });
});
