'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/components/ui/Button/Button';

/**
 * Navigates to the admin users view (`/admin/users`). A small client boundary so the admin hub
 * page stays a Server Component, mirroring {@link CreateUserButton}.
 */
export function ManageUsersLink() {
  const router = useRouter();

  return (
    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/users')}>
      Manage Users
    </Button>
  );
}
