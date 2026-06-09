import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CreateCollectionForm from '@/app/(admin)/collection/manage/[[...slug]]/CreateCollectionForm';
import { createCollection } from '@/app/lib/api/collections';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
const mockReplace = jest.fn();

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/components/ContentCollection/edit/collectionEditUtils', () => ({
  revalidateCollectionCache: jest.fn(async () => {}),
}));

const mockCreate = createCollection as jest.MockedFunction<typeof createCollection>;

describe('CreateCollectionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockReset();
  });

  it('blocks submit and shows an error when the title is blank', async () => {
    render(<CreateCollectionForm />);
    fireEvent.submit(screen.getByRole('button', { name: /create collection/i }).closest('form')!);

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the collection and redirects into ?manage=1 on success', async () => {
    mockCreate.mockResolvedValue({
      collection: { id: 5, slug: 'film-pack-002' },
    } as unknown as Awaited<ReturnType<typeof createCollection>>);

    render(<CreateCollectionForm />);
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Film Pack 002' } });
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Film Pack 002' }));
    });
    expect(mockReplace).toHaveBeenCalledWith('/film-pack-002?manage=1');
  });

  it('surfaces an API error and does not redirect', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));

    render(<CreateCollectionForm />);
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    expect(await screen.findByText(/failed to create collection/i)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
