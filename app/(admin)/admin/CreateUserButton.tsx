'use client';

import { useState } from 'react';

import CreateUserModal from '@/app/components/CreateUserModal/CreateUserModal';
import { Button } from '@/app/components/ui/Button/Button';

/**
 * "Create User" button + modal, living in the admin hub header.
 * Kept in a small client boundary so the parent page stays a Server Component.
 */
export function CreateUserButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Create User
      </Button>
      <CreateUserModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
