'use client';

import { Chip } from '@/app/components/ui/Chip/Chip';
import { CHIP_ICONS } from '@/app/components/ui/Chip/chipIcons';
import { useLogout } from '@/app/hooks/useLogout';

/** Log out as a chip on the viewer's own space, where the phone menu no longer carries it. */
export function LogoutChip() {
  const logout = useLogout();
  return <Chip label="Log out" icon={CHIP_ICONS.logout} hideLabelBelow onToggle={logout} />;
}
