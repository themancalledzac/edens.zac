/**
 * Tests for the static metadata exported by app/page.tsx. The byline is read from
 * `AUTHOR_NAME` so the home page, the collection route and the JSON-LD author cannot drift apart.
 */

import { metadata } from '@/app/page';
import { AUTHOR_NAME } from '@/app/utils/structuredData';

jest.mock('@/app/components/ContentCollection/CollectionPageWrapper', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('home page metadata', () => {
  it('spells the byline from AUTHOR_NAME in the description', () => {
    expect(metadata.description).toBe(
      `Photography portfolio by ${AUTHOR_NAME} — landscape, portrait, and event photography`
    );
    expect(metadata.description).toContain('Zac Edens');
  });

  it('uses the same description for openGraph', () => {
    expect(metadata.openGraph).toBeDefined();
    expect((metadata.openGraph as { description?: string }).description).toBe(metadata.description);
  });
});
