import { render, screen } from '@testing-library/react';

import { Checkbox } from '@/app/components/ui/Field/Checkbox';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { Textarea } from '@/app/components/ui/Field/Textarea';

describe('Field', () => {
  it('associates the label with the control via htmlFor/id', () => {
    render(
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" />
      </Field>
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('renders hint text when provided', () => {
    render(
      <Field label="Email" htmlFor="e" hint="We never share your email">
        <Input id="e" />
      </Field>
    );
    expect(screen.getByText('We never share your email')).toBeInTheDocument();
  });

  it('Input forwards native attributes', () => {
    render(<Input id="i" placeholder="Your email" maxLength={320} />);
    const input = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    expect(input.maxLength).toBe(320);
  });

  it('Textarea renders as a textarea and forwards attributes', () => {
    render(<Textarea id="t" placeholder="Your message" maxLength={5000} />);
    const ta = screen.getByPlaceholderText('Your message') as HTMLTextAreaElement;
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta.maxLength).toBe(5000);
  });

  it('Select renders options', () => {
    render(
      <Select id="s" aria-label="pick">
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'pick' })).toBeInTheDocument();
  });

  it('Checkbox renders a checkbox input', () => {
    render(<Checkbox id="c" aria-label="agree" />);
    expect(screen.getByRole('checkbox', { name: 'agree' })).toBeInTheDocument();
  });

  it('FormError renders with role=alert when a message is present', () => {
    render(<FormError>Bad email</FormError>);
    expect(screen.getByRole('alert')).toHaveTextContent('Bad email');
  });

  it('FormError renders nothing when empty', () => {
    const { container } = render(<FormError>{null}</FormError>);
    expect(container).toBeEmptyDOMElement();
  });
});
