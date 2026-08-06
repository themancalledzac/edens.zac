import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';

describe('EmptyState', () => {
  it('renders its message', () => {
    render(<EmptyState>No collections yet.</EmptyState>);
    expect(screen.getByText('No collections yet.')).toBeInTheDocument();
  });

  /**
   * An empty result is a static fact, not an announcement — it is already in the document when
   * the region renders. Giving it a live region would make screen readers re-announce it on every
   * unrelated re-render. LoadingText is the one that needs politeness; this is the contrast.
   */
  it('is NOT a live region', () => {
    render(<EmptyState>No collections yet.</EmptyState>);
    const node = screen.getByText('No collections yet.');
    expect(node).not.toHaveAttribute('role');
    expect(node).not.toHaveAttribute('aria-live');
  });

  it('defaults to inline placement and takes page placement on request', () => {
    const { rerender } = render(<EmptyState>Nothing</EmptyState>);
    const inlineClass = screen.getByText('Nothing').className;

    rerender(<EmptyState align="page">Nothing</EmptyState>);
    expect(screen.getByText('Nothing').className).not.toBe(inlineClass);
  });

  it('accepts a caller className without dropping its own', () => {
    render(<EmptyState className="caller">Nothing</EmptyState>);
    const node = screen.getByText('Nothing');
    expect(node).toHaveClass('caller');
    expect(node.className.split(' ').length).toBeGreaterThan(1);
  });
});

describe('LoadingText', () => {
  it('renders its message', () => {
    render(<LoadingText>Loading users…</LoadingText>);
    expect(screen.getByText('Loading users…')).toBeInTheDocument();
  });

  /**
   * The reason this component exists. Of the six hand-rolled loading messages it replaces, only
   * one announced itself, so screen-reader users got silence where sighted users got "Loading…".
   */
  it('announces politely via role=status', () => {
    render(<LoadingText>Loading users…</LoadingText>);
    const node = screen.getByRole('status');
    expect(node).toHaveTextContent('Loading users…');
    expect(node).toHaveAttribute('aria-live', 'polite');
  });

  it('shares the placement API with EmptyState', () => {
    const { rerender } = render(<LoadingText>Loading…</LoadingText>);
    const inlineClass = screen.getByRole('status').className;

    rerender(<LoadingText align="page">Loading…</LoadingText>);
    expect(screen.getByRole('status').className).not.toBe(inlineClass);
  });
});
