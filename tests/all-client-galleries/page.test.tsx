import AllClientGalleriesPage, { metadata } from '@/app/all-client-galleries/page';
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

jest.mock('@/app/lib/components/CollectionPageWrapper', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('AllClientGalleriesPage', () => {
  it('renders <CollectionPageWrapper> with slug="all-client-galleries"', async () => {
    const element = await AllClientGalleriesPage();
    expect(element.type).toBe(CollectionPageWrapper);
    expect(element.props.slug).toBe('all-client-galleries');
  });

  it('opts out of search-engine indexing — gallery titles can leak client names', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
