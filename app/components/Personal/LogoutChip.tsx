'use client';

import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import { useLogout } from '@/app/hooks/useLogout';

/** Log out as a chip on the viewer's own space, where the phone menu no longer carries it. */
export function LogoutChip() {
  const logout = useLogout();
  return <FilterChip label="Log out" onToggle={logout} />;
}
