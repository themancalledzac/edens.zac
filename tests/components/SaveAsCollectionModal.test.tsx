import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import SaveAsCollectionModal from '@/app/components/SaveAsCollectionModal/SaveAsCollectionModal';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

describe('SaveAsCollectionModal', () => {
  it('offers only a Visibility control — the kind is not chosen here', () => {
    render(<SaveAsCollectionModal tagName="Iceland" onClose={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
    expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();
  });

  it('confirms with the selected visibility and nothing else', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<SaveAsCollectionModal tagName="Iceland" onClose={jest.fn()} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByLabelText('Visibility'), {
      target: { value: CollectionVisibility.LISTED },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save as Collection' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({ visibility: CollectionVisibility.LISTED });
    });
  });

  it('surfaces a rejection from onConfirm', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('Already exists'));
    render(<SaveAsCollectionModal tagName="Iceland" onClose={jest.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save as Collection' }));

    expect(await screen.findByText('Already exists')).toBeInTheDocument();
  });
});
