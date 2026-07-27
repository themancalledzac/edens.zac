/**
 * Tests for SectionTabs — the /user section switcher that replaced the four-accordion stack.
 *
 * Covers the ARIA tabs contract (roles, aria-selected/controls, roving tabindex, arrow-key
 * navigation) plus the two behaviors carried over from the accordion: lazy mount on first
 * activation, then kept mounted so a panel never resets when you switch away and back.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { SectionTabs } from '@/app/components/Personal/SectionTabs';

function CollectionsPanel() {
  return <div>collections-body</div>;
}

/** Holds local state so we can prove switching tabs does not reset a mounted panel. */
function StatefulPanel() {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => setN(v => v + 1)}>
      count:{n}
    </button>
  );
}

function makeTabs(overrides: Partial<Record<string, unknown>> = {}) {
  return [
    {
      key: 'collections',
      label: 'Collections',
      count: 2,
      emptyLabel: 'No collections yet.',
      content: <CollectionsPanel />,
      ...overrides,
    },
    {
      key: 'images',
      label: 'Images',
      count: 3,
      emptyLabel: 'You are not tagged in any images yet.',
      content: <StatefulPanel />,
    },
    {
      key: 'saved',
      label: 'Saved',
      count: 0,
      emptyLabel: 'You have not saved any images yet.',
      content: <div>saved-body</div>,
    },
  ];
}

describe('SectionTabs', () => {
  it('renders one tab per section with its count and an ARIA tablist', () => {
    render(<SectionTabs tabs={makeTabs()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs.map(t => t.textContent)).toEqual(['Collections2', 'Images3', 'Saved0']);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('selects the first tab by default and wires aria-selected + aria-controls', () => {
    render(<SectionTabs tabs={makeTabs()} />);

    const collections = screen.getByRole('tab', { name: /Collections/ });
    expect(collections).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Images/ })).toHaveAttribute('aria-selected', 'false');

    // The selected tab points at a panel that is actually in the document.
    const panelId = collections.getAttribute('aria-controls')!;
    expect(document.getElementById(panelId)).toBeTruthy();
    expect(screen.getByText('collections-body')).toBeInTheDocument();
  });

  it('honors defaultTabKey, falling back to the first tab when the key is unknown', () => {
    const { unmount } = render(<SectionTabs tabs={makeTabs()} defaultTabKey="saved" />);
    expect(screen.getByRole('tab', { name: /Saved/ })).toHaveAttribute('aria-selected', 'true');
    unmount();

    render(<SectionTabs tabs={makeTabs()} defaultTabKey="nope" />);
    expect(screen.getByRole('tab', { name: /Collections/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('switches panels on click, hiding the previous one', () => {
    render(<SectionTabs tabs={makeTabs()} />);

    fireEvent.click(screen.getByRole('tab', { name: /Images/ }));

    expect(screen.getByRole('tab', { name: /Images/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Collections/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    // Exactly one panel is visible at a time — that is what removes the inter-section space.
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('mounts a panel lazily and keeps it mounted after switching away', () => {
    render(<SectionTabs tabs={makeTabs()} />);

    // Images has not been opened yet, so its body was never mounted.
    expect(screen.queryByText(/count:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Images/ }));
    fireEvent.click(screen.getByText('count:0'));
    expect(screen.getByText('count:1')).toBeInTheDocument();

    // Switch away and back: the panel kept its state rather than remounting from scratch.
    fireEvent.click(screen.getByRole('tab', { name: /Collections/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Images/ }));
    expect(screen.getByText('count:1')).toBeInTheDocument();
  });

  it('renders the empty label instead of the body for a zero-count tab', () => {
    render(<SectionTabs tabs={makeTabs()} />);

    fireEvent.click(screen.getByRole('tab', { name: /Saved/ }));

    expect(screen.getByText('You have not saved any images yet.')).toBeInTheDocument();
    expect(screen.queryByText('saved-body')).not.toBeInTheDocument();
  });

  it('uses a roving tabindex so the tab bar is a single tab stop', () => {
    render(<SectionTabs tabs={makeTabs()} />);

    expect(screen.getByRole('tab', { name: /Collections/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Images/ })).toHaveAttribute('tabindex', '-1');
  });

  it('moves between tabs with arrow keys, wrapping at both ends', () => {
    render(<SectionTabs tabs={makeTabs()} />);
    const collections = screen.getByRole('tab', { name: /Collections/ });

    fireEvent.keyDown(collections, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Images/ })).toHaveAttribute('aria-selected', 'true');

    // Wrapping backwards off the first tab lands on the last.
    fireEvent.keyDown(screen.getByRole('tab', { name: /Images/ }), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('tab', { name: /Collections/ }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: /Saved/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('jumps to the ends with Home and End', () => {
    render(<SectionTabs tabs={makeTabs()} />);

    fireEvent.keyDown(screen.getByRole('tab', { name: /Collections/ }), { key: 'End' });
    expect(screen.getByRole('tab', { name: /Saved/ })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(screen.getByRole('tab', { name: /Saved/ }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: /Collections/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('renders nothing when given no tabs', () => {
    const { container } = render(<SectionTabs tabs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
