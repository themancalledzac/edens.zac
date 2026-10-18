import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelBody, panelBodyGuards } from '@/app/components/ListPanel/PanelBody';

/**
 * PanelBody renders loading, then a load error with Retry ahead of the empty state, then the stale
 * notice over data.
 *
 * The guard `panelBodyGuards.showsLoadError(loadError)` in PanelBody.tsx returns true when
 * `loadError` is non-null. PanelBody must consult it through the exported object so the twin can
 * replace it.
 */
const STALE_TEXT = /Showing cached data/;

function renderBody(overrides: Partial<Parameters<typeof PanelBody>[0]> = {}) {
  const onRetry = jest.fn();
  render(
    <PanelBody
      loading={false}
      loadError={null}
      revalidationFailed={false}
      onRetry={onRetry}
      loadingLabel="Loading users..."
      isEmpty={false}
      emptyLabel="No users yet."
      {...overrides}
    >
      <ul>
        <li>row one</li>
      </ul>
    </PanelBody>
  );
  return { onRetry };
}

describe('PanelBody', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('A8: loading shows the loading label and not the children', () => {
    renderBody({ loading: true, isEmpty: true });
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
    expect(screen.queryByText('row one')).not.toBeInTheDocument();
    expect(screen.queryByText('No users yet.')).not.toBeInTheDocument();
  });

  it('A8: a load error shows the message and a Retry that calls onRetry', async () => {
    const { onRetry } = renderBody({ loadError: 'Boom', isEmpty: true });
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('A8: empty without an error shows the empty label', () => {
    renderBody({ isEmpty: true });
    expect(screen.getByText('No users yet.')).toBeInTheDocument();
    expect(screen.queryByText('row one')).not.toBeInTheDocument();
  });

  it('A8: data renders the children with no notices', () => {
    renderBody();
    expect(screen.getByText('row one')).toBeInTheDocument();
    expect(screen.queryByText(STALE_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('A8: a failed revalidation shows the stale notice over the data', () => {
    renderBody({ revalidationFailed: true });
    expect(screen.getByText(STALE_TEXT)).toBeInTheDocument();
    expect(screen.getByText('row one')).toBeInTheDocument();
  });

  it('A9: with loadError set the error shows and the empty label does not', () => {
    renderBody({ loadError: 'Backend down', isEmpty: true });
    expect(screen.getByText('Backend down')).toBeInTheDocument();
    expect(screen.queryByText('No users yet.')).not.toBeInTheDocument();
  });

  it('twin A9: with the error check off an errored empty list shows the empty label', () => {
    jest.spyOn(panelBodyGuards, 'showsLoadError').mockImplementation(() => false);
    renderBody({ loadError: 'Backend down', isEmpty: true });
    expect(screen.getByText('No users yet.')).toBeInTheDocument();
    expect(screen.queryByText('Backend down')).not.toBeInTheDocument();
  });
});
