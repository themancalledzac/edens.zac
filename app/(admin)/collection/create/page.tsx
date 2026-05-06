import ManageClient from '../manage/[[...slug]]/ManageClient';

export const dynamic = 'force-dynamic';

// ManageClient renders create mode whenever slug is undefined
// (see ManageClient.tsx: `const isCreateMode = !slug;`). This page is the
// stable URL for the create flow; the proxy already allowlists it as an
// admin route, and the admin hub tile points here.
export default function CreateCollectionPage() {
  return <ManageClient slug={undefined} />;
}
