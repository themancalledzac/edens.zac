/**
 * Tests for CornerToggle — the shared corner box behind the save heart and the follow button. The
 * component tests cover the pressed state, placement, label, icon slot and click handling; the
 * stylesheet tests pin the corner-box rules by reading the SCSS source, since jest cannot see
 * computed CSS-module styles.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';

import { CornerToggle } from '@/app/components/Content/CornerToggle';

const scss = readFileSync(
  path.join(process.cwd(), 'app/components/Content/CornerToggle.module.scss'),
  'utf8'
);

const icon = <svg data-testid="glyph" />;

describe('CornerToggle', () => {
  it('renders a type="button" with the label as its accessible name', () => {
    render(<CornerToggle pressed={false} onToggle={jest.fn()} label="Save it" icon={icon} />);
    const button = screen.getByRole('button', { name: 'Save it' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('exposes aria-pressed for both states', () => {
    const { rerender } = render(
      <CornerToggle pressed={false} onToggle={jest.fn()} label="Toggle" icon={icon} />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(<CornerToggle pressed onToggle={jest.fn()} label="Toggle" icon={icon} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies the active class only when pressed', () => {
    const { rerender } = render(
      <CornerToggle pressed={false} onToggle={jest.fn()} label="Toggle" icon={icon} />
    );
    expect(screen.getByRole('button').className).not.toMatch(/cornerToggleActive/);
    rerender(<CornerToggle pressed onToggle={jest.fn()} label="Toggle" icon={icon} />);
    expect(screen.getByRole('button').className).toMatch(/cornerToggleActive/);
  });

  it('applies the bottom class only for the bottom placement', () => {
    const { rerender } = render(
      <CornerToggle pressed={false} onToggle={jest.fn()} label="Toggle" icon={icon} />
    );
    expect(screen.getByRole('button').className).not.toMatch(/cornerToggleBottom/);
    rerender(
      <CornerToggle
        pressed={false}
        onToggle={jest.fn()}
        label="Toggle"
        icon={icon}
        placement="top"
      />
    );
    expect(screen.getByRole('button').className).not.toMatch(/cornerToggleBottom/);
    rerender(
      <CornerToggle
        pressed={false}
        onToggle={jest.fn()}
        label="Toggle"
        icon={icon}
        placement="bottom"
      />
    );
    expect(screen.getByRole('button').className).toMatch(/cornerToggleBottom/);
  });

  it('renders the icon slot inside the button', () => {
    render(<CornerToggle pressed={false} onToggle={jest.fn()} label="Toggle" icon={icon} />);
    expect(screen.getByRole('button')).toContainElement(screen.getByTestId('glyph'));
  });

  it('calls onToggle once and stops the click from navigating or bubbling', () => {
    const onToggle = jest.fn();
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <CornerToggle pressed={false} onToggle={onToggle} label="Toggle" icon={icon} />
      </div>
    );
    const button = screen.getByRole('button');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefault = jest.spyOn(event, 'preventDefault');
    const stopPropagation = jest.spyOn(event, 'stopPropagation');
    fireEvent(button, event);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe('CornerToggle stylesheet', () => {
  it('sizes a 32px var(--space-6) square with the dark scrim and 18px glyph', () => {
    expect(scss).toMatch(/width: var\(--space-6\)/);
    expect(scss).toMatch(/height: var\(--space-6\)/);
    expect(scss).toMatch(/background: var\(--scrim-dark-50\)/);
    expect(scss).toMatch(/svg\s*{[^}]*width: 18px;[^}]*height: 18px/);
  });

  it('pins top placement to top: 0 / right: 0 and bottom placement to bottom: 0 / right: 0', () => {
    expect(scss).toMatch(/\.cornerToggle\s*{[^}]*top: 0;[^}]*right: 0;/);
    expect(scss).toMatch(/\.cornerToggleBottom\s*{[^}]*top: auto;[^}]*bottom: 0;[^}]*right: 0;/);
  });

  it('hides at rest under (hover: hover) and reveals on wrapper and parent hover', () => {
    const hover = scss.slice(scss.indexOf('@media (hover: hover)'));
    expect(hover).toMatch(/\.cornerToggle\s*{\s*opacity: 0;/);
    expect(hover).toContain('[data-parallax-container]:hover .cornerToggle');
    expect(hover).toContain('[data-image-wrapper]:hover .cornerToggle');
    expect(hover).toMatch(/:hover > \.cornerToggle/);
  });

  it('keeps a pressed toggle visible', () => {
    expect(scss).toMatch(/\.cornerToggleActive\s*{\s*opacity: 0\.6;/);
  });

  it('adds a 44px coarse-pointer overlay with 0.6 idle opacity', () => {
    const coarse = scss.slice(scss.indexOf('@media (pointer: coarse)'));
    expect(coarse).toMatch(/\.cornerToggle\s*{\s*opacity: 0\.6;/);
    expect(coarse).toMatch(/::after\s*{[^}]*width: 44px;[^}]*height: 44px/);
  });

  it('anchors the coarse overlay to the bottom corner for bottom placement', () => {
    expect(scss).toMatch(/\.cornerToggleBottom::after\s*{[^}]*bottom: 0;/);
  });
});
