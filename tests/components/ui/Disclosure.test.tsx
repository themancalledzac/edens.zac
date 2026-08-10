import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { Disclosure, type DisclosureProps } from '@/app/components/ui/Disclosure/Disclosure';

const renderDisclosure = (open: boolean, extra: Partial<DisclosureProps> = {}) => {
  const onOpenChange = jest.fn();
  render(
    <Disclosure title="Blogs" open={open} onOpenChange={onOpenChange} {...extra}>
      <p>panel content</p>
    </Disclosure>
  );
  return onOpenChange;
};

const toggle = () => screen.getByRole('button', { name: /blogs/i });

describe('Disclosure', () => {
  it('renders the title as an expanded toggle, with the panel showing', () => {
    renderDisclosure(true);
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('panel content')).toBeInTheDocument();
  });

  it('unmounts the panel when closed', () => {
    renderDisclosure(false);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('panel content')).not.toBeInTheDocument();
  });

  it('asks to close when clicked while open', () => {
    const onOpenChange = renderDisclosure(true);
    fireEvent.click(toggle());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('asks to open when clicked while closed', () => {
    const onOpenChange = renderDisclosure(false);
    fireEvent.click(toggle());
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  // Controlled-only: the primitive never moves on its own, so a caller that ignores the callback
  // sees no change. This is what lets one caller run a one-open-at-a-time accordion.
  it('does not open itself when the caller ignores the change', () => {
    renderDisclosure(false);
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('panel content')).not.toBeInTheDocument();
  });

  it('points aria-controls at the panel it hides', () => {
    renderDisclosure(true);
    const id = toggle().getAttribute('aria-controls');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toHaveTextContent('panel content');
  });

  // The panel is unmounted while closed, so an aria-controls left behind would point at nothing —
  // an invalid IDREF. Same convention as EditBar's inactive tabs and MenuDropdown's disclosures.
  it('drops aria-controls while the panel is unmounted', () => {
    renderDisclosure(false);
    expect(toggle()).not.toHaveAttribute('aria-controls');
  });

  it('generates a unique panel id per instance so two disclosures do not collide', () => {
    render(
      <>
        <Disclosure title="One" open onOpenChange={jest.fn()}>
          a
        </Disclosure>
        <Disclosure title="Two" open onOpenChange={jest.fn()}>
          b
        </Disclosure>
      </>
    );
    const ids = screen.getAllByRole('button').map(b => b.getAttribute('aria-controls'));
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

  // A bare chevron glyph is read out as "black down-pointing small triangle" — one of the
  // hand-rolled implementations this replaces did exactly that.
  it('hides the chevron from the accessible name', () => {
    renderDisclosure(true);
    expect(screen.getByRole('button', { name: 'Blogs' })).toBeInTheDocument();
    expect(screen.getByText('▾')).toHaveAttribute('aria-hidden', 'true');
  });

  it('turns the chevron down when open and right when closed', () => {
    const { unmount } = render(
      <Disclosure title="Blogs" open onOpenChange={jest.fn()}>
        body
      </Disclosure>
    );
    expect(screen.getByText('▾')).toBeInTheDocument();
    unmount();
    render(
      <Disclosure title="Blogs" open={false} onOpenChange={jest.fn()}>
        body
      </Disclosure>
    );
    expect(screen.getByText('▸')).toBeInTheDocument();
  });

  it('renders no heading by default', () => {
    renderDisclosure(true);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('puts the toggle inside a heading of the requested level', () => {
    renderDisclosure(true, { headingLevel: 2 });
    const heading = screen.getByRole('heading', { name: /blogs/i, level: 2 });
    expect(heading.querySelector('button')).not.toBeNull();
  });

  it('supports h3 for regions nested under an existing h2', () => {
    renderDisclosure(true, { headingLevel: 3 });
    expect(screen.getByRole('heading', { name: /blogs/i, level: 3 })).toBeInTheDocument();
  });

  // The action controls sit OUTSIDE the toggle button: nesting them would be invalid HTML, and
  // would make every click on them collapse the region out from under whatever they opened.
  it('renders an action beside the toggle without nesting it, and clicking it does not toggle', () => {
    const onOpenChange = renderDisclosure(true, {
      action: <button type="button">+ New User</button>,
    });
    const action = screen.getByRole('button', { name: '+ New User' });
    expect(toggle()).not.toContainElement(action);
    fireEvent.click(action);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps the action reachable while closed', () => {
    renderDisclosure(false, { action: <button type="button">+ New User</button> });
    expect(screen.getByRole('button', { name: '+ New User' })).toBeInTheDocument();
  });

  // CSS modules are mocked by next/jest as an identity proxy, so the primitive's own class comes
  // through as its literal name alongside whatever the adopter passes.
  it('merges adopter classes onto its own parts', () => {
    render(
      <Disclosure
        title="Blogs"
        open
        onOpenChange={jest.fn()}
        headingLevel={2}
        classNames={{
          header: 'skin-header',
          heading: 'skin-heading',
          toggle: 'skin-toggle',
          chevron: 'skin-chevron',
          panel: 'skin-panel',
        }}
      >
        panel content
      </Disclosure>
    );
    expect(toggle()).toHaveClass('toggle', 'skin-toggle');
    expect(screen.getByText('▾')).toHaveClass('chevron', 'skin-chevron');
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('skin-heading');
    expect(screen.getByText('panel content')).toHaveClass('skin-panel');
    expect(toggle().closest('.skin-header')).not.toBeNull();
  });
});
