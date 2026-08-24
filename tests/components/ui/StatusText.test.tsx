import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadError } from '@/app/components/ui/StatusText/LoadError';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { StaleNotice } from '@/app/components/ui/StatusText/StaleNotice';

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
  it('renders its message while the read is in flight', () => {
    render(<LoadingText isLoading>Loading users…</LoadingText>);
    expect(screen.getByText('Loading users…')).toBeInTheDocument();
  });

  /**
   * The reason this component exists. Of the six hand-rolled loading messages it replaces, only
   * one announced itself, so screen-reader users got silence where sighted users got "Loading…".
   */
  it('announces politely via role=status', () => {
    render(<LoadingText isLoading>Loading users…</LoadingText>);
    const node = screen.getByRole('status');
    expect(node).toHaveTextContent('Loading users…');
    expect(node).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps the region mounted and empty when nothing is loading', () => {
    render(<LoadingText isLoading={false}>Loading users…</LoadingText>);
    const node = screen.getByRole('status');
    expect(node).toBeEmptyDOMElement();
    expect(node).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByText('Loading users…')).not.toBeInTheDocument();
  });

  /**
   * The whole point of the component, and the only assertion that can catch a regression back to
   * `{isLoading && <LoadingText>…}`: a live region that appears with its text already inside is
   * routinely not announced. Node identity across the transition is what proves the region was
   * there first and only its text changed.
   */
  it('is the same DOM node before, during, and after the read', () => {
    const { rerender } = render(<LoadingText isLoading={false}>Loading users…</LoadingText>);
    const before = screen.getByRole('status');

    rerender(<LoadingText isLoading>Loading users…</LoadingText>);
    const during = screen.getByRole('status');
    expect(during).toBe(before);
    expect(during).toHaveTextContent('Loading users…');

    rerender(<LoadingText isLoading={false}>Loading users…</LoadingText>);
    const after = screen.getByRole('status');
    expect(after).toBe(before);
    expect(after).toBeEmptyDOMElement();
  });

  it('shares the placement API with EmptyState', () => {
    const { rerender } = render(<LoadingText isLoading>Loading…</LoadingText>);
    const inlineClass = screen.getByRole('status').className;

    rerender(
      <LoadingText isLoading align="page">
        Loading…
      </LoadingText>
    );
    expect(screen.getByRole('status').className).not.toBe(inlineClass);
  });

  /**
   * A caller className is additive, never a replacement — `.text:empty` is what collapses the
   * padding of an idle region, so losing the component's own class would give every caller a
   * permanently-tall gap. Both classes are named outright rather than counted: how many classes
   * the component emits is its own business, and would change the moment they were merged into one.
   */
  it('adds a caller className alongside its own, rather than replacing them', () => {
    render(
      <LoadingText isLoading className="caller">
        Loading…
      </LoadingText>
    );
    expect(screen.getByRole('status')).toHaveClass('text', 'inline', 'caller');
  });

  it('carries its own classes when the caller supplies none', () => {
    render(<LoadingText isLoading>Loading…</LoadingText>);
    const node = screen.getByRole('status');
    expect(node).toHaveClass('text', 'inline');
    expect(node).not.toHaveClass('caller');
  });
});

describe('StaleNotice', () => {
  /**
   * The copy is the component's, not the caller's — all three admin panels say the same thing,
   * and a message about the freshness of data should not be one a caller can quietly reword into
   * something reassuring.
   */
  it('states that what is on screen came from cache', () => {
    render(<StaleNotice />);
    expect(screen.getByText(/showing cached data/i)).toBeInTheDocument();
  });

  /**
   * Unlike EmptyState, this one appears without the viewer having done anything — a background
   * read failed — so it announces. Politely: nothing here is urgent, the data is merely old.
   */
  it('announces via role=status', () => {
    render(<StaleNotice />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shares the placement API with its siblings', () => {
    const { rerender } = render(<StaleNotice />);
    expect(screen.getByRole('status')).toHaveClass('text', 'inline');

    rerender(<StaleNotice align="page" />);
    expect(screen.getByRole('status')).toHaveClass('text', 'page');
  });

  it('adds a caller className alongside its own, rather than replacing them', () => {
    render(<StaleNotice className="caller" />);
    expect(screen.getByRole('status')).toHaveClass('text', 'inline', 'caller');
  });
});

describe('LoadError', () => {
  it('renders the message it is handed, verbatim', () => {
    render(<LoadError message="Failed to load users." onRetry={jest.fn()} />);
    expect(screen.getByText('Failed to load users.')).toBeInTheDocument();
  });

  /**
   * The one member of the family that is `role="alert"` rather than `role="status"` or no role at
   * all. A failed read is a dead end the viewer has to act on, and unlike the pending and
   * cached-data messages it always arrives as a change to an already-mounted subtree — the panel
   * was loading a moment ago — which is the insertion case that announces reliably.
   */
  it('announces assertively via role=alert, unlike its three siblings', () => {
    render(<LoadError message="Failed to load users." onRetry={jest.fn()} />);
    const node = screen.getByRole('alert');
    expect(node).toHaveTextContent('Failed to load users.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  /**
   * The Retry control is the component's, not a slot. All four admin panels passed the same
   * `secondary`/`sm` Button with the same label, and a recovery affordance that differs per panel
   * reads as a bug on a hub where the panels sit side by side.
   */
  it('offers a Retry control that runs the caller handler once per click', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<LoadError message="Failed to load users." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /**
   * The loud/muted split, asserted rather than left to the stylesheet. `.text` is the muted rule
   * EmptyState, LoadingText and StaleNotice share; this message must NOT pick it up, because the
   * whole reason the other three are muted is so a failed read can carry the danger colour alone.
   */
  it('does not wear the muted .text class its three siblings share', () => {
    render(<LoadError message="Failed to load users." onRetry={jest.fn()} />);
    const message = screen.getByText('Failed to load users.');
    expect(message).toHaveClass('loadErrorMessage');
    expect(message).not.toHaveClass('text');
    expect(screen.getByRole('alert')).toHaveClass('loadError');
  });
});
