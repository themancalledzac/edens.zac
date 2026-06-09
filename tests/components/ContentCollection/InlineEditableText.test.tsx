import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { InlineEditableText } from '@/app/components/ContentCollection/edit/InlineEditableText';

describe('InlineEditableText', () => {
  it('renders read-only text until clicked, then becomes an editable input', () => {
    render(<InlineEditableText as="input" value="Dolomites" onCommit={jest.fn()} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Dolomites'));
    expect(screen.getByRole('textbox')).toHaveValue('Dolomites');
  });

  it('commits the new value on blur', () => {
    const onCommit = jest.fn();
    render(<InlineEditableText as="input" value="old" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('old'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new' } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith('new');
  });

  it('commits on Enter for an input', () => {
    const onCommit = jest.fn();
    render(<InlineEditableText as="input" value="old" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('old'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'typed' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledWith('typed');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('reverts and exits on Escape without committing', () => {
    const onCommit = jest.fn();
    render(<InlineEditableText as="input" value="original" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('original'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('original')).toBeInTheDocument();
  });

  it('does not commit when the value is unchanged', () => {
    const onCommit = jest.fn();
    render(<InlineEditableText as="input" value="same" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('same'));
    fireEvent.blur(screen.getByRole('textbox'));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('keeps a newline on Shift+Enter in a textarea and commits on plain Enter', () => {
    const onCommit = jest.fn();
    render(<InlineEditableText as="textarea" value="line" onCommit={onCommit} />);

    fireEvent.click(screen.getByText('line'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'line one' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('line one');
  });
});
