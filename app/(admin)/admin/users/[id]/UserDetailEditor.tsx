'use client';

import { useRouter } from 'next/navigation';

import { UserForm } from '@/app/components/UserForm/UserForm';
import { type AdminUserSummary } from '@/app/types/User';

export interface UserDetailEditorProps {
  user: AdminUserSummary;
}

/**
 * Client wrapper that mounts the canonical {@link UserForm} (edit mode) on the user detail page.
 * Bridges the server page → client callbacks: a successful save refreshes the route so the page
 * preview below reflects the new values; Cancel returns to the admin hub.
 */
export function UserDetailEditor({ user }: UserDetailEditorProps) {
  const router = useRouter();
  return (
    <UserForm
      mode="edit"
      user={user}
      onSuccess={() => router.refresh()}
      onCancel={() => router.push('/admin')}
    />
  );
}

export default UserDetailEditor;
