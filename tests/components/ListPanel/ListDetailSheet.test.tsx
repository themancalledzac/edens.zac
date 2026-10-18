import { fireEvent, render, screen } from '@testing-library/react';

import { ListDetailSheet } from '@/app/components/ListPanel/ListDetailSheet';

/**
 * The detail sheet every tab opens from a row: a bottom-sheet Modal with a title, a close button,
 * its children and an optional footer.
 */
describe('ListDetailSheet', () => {
  const renderSheet = (props: { open?: boolean; footer?: boolean } = {}) => {
    const onClose = jest.fn();
    render(
      <ListDetailSheet
        open={props.open ?? true}
        onClose={onClose}
        title="Ada Lovelace"
        footer={props.footer ? <button type="button">Save</button> : undefined}
      >
        <p>detail body</p>
      </ListDetailSheet>
    );
    return onClose;
  };

  it('renders a dialog named by its title', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('renders its children', () => {
    renderSheet();
    expect(screen.getByText('detail body')).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    renderSheet({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('detail body')).not.toBeInTheDocument();
  });

  it('uses the sheet-bottom Modal variant', () => {
    renderSheet();
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    expect(backdrop.className).toMatch(/sheetBottom/);
  });

  it('has a close button that calls onClose', () => {
    const onClose = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', () => {
    const onClose = renderSheet();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the footer when given one', () => {
    renderSheet({ footer: true });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders no footer content when none is given', () => {
    renderSheet();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });
});
