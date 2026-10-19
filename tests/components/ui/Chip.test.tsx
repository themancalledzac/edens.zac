import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';

import { Chip } from '@/app/components/ui/Chip/Chip';
import { CHIP_ICONS } from '@/app/components/ui/Chip/chipIcons';
import { ChipRow } from '@/app/components/ui/Chip/ChipRow';

/** Passes `next/link` through as a plain anchor and records `scroll` on a data attribute. */
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    scroll,
    children,
    ...rest
  }: {
    scroll?: boolean;
    children: ReactNode;
    href: string;
  }) => (
    <a {...rest} data-scroll={String(scroll)}>
      {children}
    </a>
  ),
}));

describe('Chip', () => {
  it('renders a text chip as a real button named by its label', () => {
    render(<Chip label="Tags" onToggle={jest.fn()} />);
    const chip = screen.getByRole('button', { name: 'Tags' });
    expect(chip).toHaveAttribute('type', 'button');
    expect(chip).not.toHaveAttribute('aria-label');
    expect(chip.querySelector('svg')).toBeNull();
  });

  it('gives an icon-only chip an aria-label and hides the icon from assistive tech', () => {
    render(
      <Chip
        label="Hidden"
        ariaLabel="Show hidden items"
        icon={CHIP_ICONS.hidden}
        hideLabelBelow
        onToggle={jest.fn()}
      />
    );
    const chip = screen.getByRole('button', { name: 'Show hidden items' });
    expect(chip).toHaveAttribute('aria-label', 'Show hidden items');
    expect(chip.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Hidden').className).toMatch(/labelWide/);
  });

  it('falls back to the label for an icon-only chip with no ariaLabel', () => {
    render(<Chip label="People" icon={CHIP_ICONS.people} hideLabelBelow onToggle={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute('aria-label', 'People');
  });

  it('drops the label node entirely when hideLabel is set', () => {
    render(
      <Chip label="Large photos" icon={CHIP_ICONS.densityLarge} hideLabel onToggle={jest.fn()} />
    );
    const chip = screen.getByRole('button', { name: 'Large photos' });
    expect(chip.textContent).toBe('');
  });

  it('shows the count as a muted numeral and adds it to an icon-only name', () => {
    render(
      <Chip label="Rated" icon={CHIP_ICONS.rated} hideLabelBelow count={7} onToggle={jest.fn()} />
    );
    const chip = screen.getByRole('button', { name: 'Rated, 7' });
    const count = screen.getByText('7');
    expect(count).toHaveAttribute('aria-hidden', 'true');
    expect(count.className).toMatch(/count/);
    expect(chip).toContainElement(count);
  });

  it('shows a zero count rather than dropping it', () => {
    render(<Chip label="Following" count={0} onToggle={jest.fn()} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('omits the count node when count is undefined', () => {
    render(<Chip label="Tags" onToggle={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Tags' }).textContent).toBe('Tags');
  });

  it('marks an active toggle with aria-pressed and the active class', () => {
    render(<Chip label="Rated" active onToggle={jest.fn()} />);
    const chip = screen.getByRole('button', { name: 'Rated' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip.className).toMatch(/active/);
  });

  it('sets aria-pressed="false" for an inactive toggle and nothing for a one-shot action', () => {
    const { unmount } = render(<Chip label="Rated" active={false} onToggle={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Rated' })).toHaveAttribute('aria-pressed', 'false');
    unmount();
    render(<Chip label="Share" onToggle={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Share' })).not.toHaveAttribute('aria-pressed');
  });

  it('flips the icon when iconFlipped is set', () => {
    render(<Chip label="Order" icon={CHIP_ICONS.order} iconFlipped onToggle={jest.fn()} />);
    const icon = screen.getByRole('button', { name: 'Order' }).querySelector('svg');
    expect(icon?.getAttribute('class')).toMatch(/flipped/);
  });

  it('calls onToggle on click', () => {
    const onToggle = jest.fn();
    render(<Chip label="Rated" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rated' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('disables an unavailable chip so it cannot be toggled', () => {
    const onToggle = jest.fn();
    render(<Chip label="forest" state="unavailable" onToggle={onToggle} />);
    const chip = screen.getByRole('button', { name: 'forest' });
    expect(chip).toBeDisabled();
    expect(chip.className).toMatch(/unavailable/);
    fireEvent.click(chip);
    expect(onToggle).not.toHaveBeenCalled();
  });

  describe('menu trigger', () => {
    it('sets popup aria, skips aria-pressed and draws a desktop caret', () => {
      render(
        <Chip
          label="Date"
          icon={CHIP_ICONS.date}
          hideLabelBelow
          menu={{ open: false }}
          onToggle={jest.fn()}
        />
      );
      const chip = screen.getByRole('button', { name: 'Date' });
      expect(chip).toHaveAttribute('aria-haspopup', 'true');
      expect(chip).toHaveAttribute('aria-expanded', 'false');
      expect(chip).not.toHaveAttribute('aria-pressed');
      expect(chip.className).not.toMatch(/active/);
      expect(chip.lastElementChild?.className).toMatch(/caret/);
      expect(chip.lastElementChild?.textContent).toBe('▾');
    });

    it('takes the active look while open', () => {
      render(<Chip label="Date" menu={{ open: true }} onToggle={jest.fn()} />);
      const chip = screen.getByRole('button', { name: /^Date/ });
      expect(chip).toHaveAttribute('aria-expanded', 'true');
      expect(chip.className).toMatch(/active/);
      expect(chip.lastElementChild?.textContent).toBe('▴');
    });

    it('forwards its ref to the button so focus can return to it', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Chip ref={ref} label="Date" menu={{ open: false }} onToggle={jest.fn()} />);
      expect(ref.current).toBe(screen.getByRole('button', { name: /^Date/ }));
    });
  });

  describe('radio option', () => {
    it('renders role="radio" with aria-checked instead of aria-pressed', () => {
      render(
        <ChipRow radioGroupLabel="Photo size">
          <Chip radio label="Large photos" active onToggle={jest.fn()} />
          <Chip radio label="Small photos" active={false} onToggle={jest.fn()} />
        </ChipRow>
      );
      expect(screen.getByRole('radiogroup', { name: 'Photo size' })).toBeInTheDocument();
      const large = screen.getByRole('radio', { name: 'Large photos' });
      expect(large).toBeChecked();
      expect(large).not.toHaveAttribute('aria-pressed');
      expect(screen.getByRole('radio', { name: 'Small photos' })).not.toBeChecked();
    });
  });

  describe('link variant', () => {
    it('renders a link with aria-current when active and scroll off by default', () => {
      render(<Chip label="Saved" href="/user?tab=saved" active />);
      const link = screen.getByRole('link', { name: 'Saved' });
      expect(link).toHaveAttribute('href', '/user?tab=saved');
      expect(link).toHaveAttribute('aria-current', 'page');
      expect(link).toHaveAttribute('data-scroll', 'false');
    });

    it('leaves aria-current off an inactive link and forwards scroll', () => {
      render(<Chip label="Images" href="/user?tab=images" scroll />);
      const link = screen.getByRole('link', { name: 'Images' });
      expect(link).not.toHaveAttribute('aria-current');
      expect(link).toHaveAttribute('data-scroll', 'true');
    });

    it('gives an icon-only link an aria-label with its count', () => {
      render(
        <Chip
          label="Collections"
          href="/admin?tab=collections"
          icon={CHIP_ICONS.people}
          hideLabelBelow
          count={15}
        />
      );
      expect(screen.getByRole('link', { name: 'Collections, 15' })).toBeInTheDocument();
    });

    it('degrades an unavailable link to an inert span', () => {
      render(<Chip label="Saved" href="/user?tab=saved" state="unavailable" />);
      expect(screen.queryByRole('link')).toBeNull();
      expect(screen.getByText('Saved').parentElement?.tagName).toBe('SPAN');
    });
  });
});

describe('Chip — dialog, tab and in-place link', () => {
  it('marks a dialog trigger with aria-haspopup and its open state, not aria-pressed', () => {
    const { rerender } = render(
      <Chip
        label="Share"
        icon={CHIP_ICONS.share}
        hideLabelBelow
        onToggle={jest.fn()}
        dialog={{ open: false }}
      />
    );
    const chip = screen.getByRole('button', { name: 'Share' });
    expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    expect(chip).not.toHaveAttribute('aria-pressed');
    rerender(
      <Chip
        label="Share"
        icon={CHIP_ICONS.share}
        hideLabelBelow
        onToggle={jest.fn()}
        dialog={{ open: true }}
      />
    );
    expect(chip).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders a tab: selected one in the Tab order and pointing at the panel', () => {
    render(
      <div role="tablist">
        <Chip
          label="Messages"
          active
          tab={{ id: 't-messages', controls: 'panel' }}
          onToggle={jest.fn()}
        />
        <Chip
          label="Users"
          active={false}
          tab={{ id: 't-users', controls: 'panel' }}
          onToggle={jest.fn()}
        />
      </div>
    );
    const [selected, other] = screen.getAllByRole('tab');
    expect(selected).toHaveAttribute('id', 't-messages');
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('tabindex', '0');
    expect(selected).toHaveAttribute('aria-controls', 'panel');
    expect(other).toHaveAttribute('aria-selected', 'false');
    expect(other).toHaveAttribute('tabindex', '-1');
    expect(other).not.toHaveAttribute('aria-controls');
    expect(selected).not.toHaveAttribute('aria-pressed');
  });

  it('lets onSelect take over a plain click on a link and keeps the href', () => {
    const onSelect = jest.fn();
    render(<Chip label="Images" href="/user?tab=images" onSelect={onSelect} />);
    const link = screen.getByRole('link', { name: 'Images' });
    expect(fireEvent.click(link)).toBe(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(link).toHaveAttribute('href', '/user?tab=images');
  });

  it.each([
    ['meta', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle button', { button: 1 }],
  ])('leaves a %s click to the link, without calling onSelect', (_name, init) => {
    const onSelect = jest.fn();
    render(<Chip label="Images" href="/user?tab=images" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('link', { name: 'Images' }), init);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('ChipRow', () => {
  it('draws the underline by default and drops it on request', () => {
    const { container, rerender } = render(
      <ChipRow>
        <Chip label="A" onToggle={jest.fn()} />
      </ChipRow>
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/underline/);
    rerender(
      <ChipRow underline={false}>
        <Chip label="A" onToggle={jest.fn()} />
      </ChipRow>
    );
    expect((container.firstChild as HTMLElement).className).not.toMatch(/underline/);
  });

  it('is a plain group, not a radiogroup, without a label', () => {
    render(
      <ChipRow wrap="reverse" className="extra">
        <Chip label="A" onToggle={jest.fn()} />
      </ChipRow>
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    const row = screen.getByRole('button', { name: 'A' }).parentElement as HTMLElement;
    expect(row.className).toMatch(/wrapReverse/);
    expect(row.className).toMatch(/extra/);
  });
});
