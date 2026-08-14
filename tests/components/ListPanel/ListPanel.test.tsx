import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ListPanel, ListRow, ListRows } from '@/app/components/ListPanel/ListPanel';

describe('ListPanel header', () => {
  it('the toggle is bounded to the title, not the whole bar', () => {
    render(
      <ListPanel
        title="Users"
        headerRight={<button type="button">+ New</button>}
        collapsed={false}
        onCollapsedChange={() => {}}
      >
        <p>body</p>
      </ListPanel>
    );
    const toggle = screen.getByRole('button', { name: /users/i });
    expect(toggle).not.toHaveTextContent('+ New');
  });

  it('keeps the action outside the toggle and independently clickable', async () => {
    const onAction = jest.fn();
    const onCollapsedChange = jest.fn();
    render(
      <ListPanel
        title="Users"
        headerRight={
          <button type="button" onClick={onAction}>
            + New
          </button>
        }
        collapsed={false}
        onCollapsedChange={onCollapsedChange}
      >
        <p>body</p>
      </ListPanel>
    );
    await userEvent.click(screen.getByRole('button', { name: '+ New' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onCollapsedChange).not.toHaveBeenCalled();
  });

  it('renders a middle slot when given one', () => {
    render(
      <ListPanel
        title="Users"
        headerMiddle={<label>Show people</label>}
        collapsed={false}
        onCollapsedChange={() => {}}
      >
        <p>body</p>
      </ListPanel>
    );
    expect(screen.getByText('Show people')).toBeInTheDocument();
  });
});

describe('ListRow', () => {
  it('renders left and right sections', () => {
    render(<ListRow left={<span>name</span>} right={<button type="button">Update</button>} />, {
      wrapper: ListRows,
    });
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('is a button when activatable and static otherwise', () => {
    const { rerender } = render(
      <ListRow left={<span>a</span>} onActivate={() => {}} ariaLabel="Open a" />,
      { wrapper: ListRows }
    );
    expect(screen.getByRole('button', { name: 'Open a' })).toBeInTheDocument();
    rerender(<ListRow left={<span>a</span>} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
