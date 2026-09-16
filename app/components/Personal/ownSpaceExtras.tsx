import { CHIP_WEIGHT, type ToolbarExtra } from '@/app/components/ui/FilterToolbar/chipWeights';
import { type ShareSettingsRead } from '@/app/lib/api/share';
import { type MeResponse } from '@/app/types/Auth';

import { ContactChip } from './ContactChip';
import { PasskeyChip } from './PasskeyChip';
import { ShareChip } from './ShareChip';

/** The chips every signed-in viewer gets on their own space, for the bar's upper tier. */
export function ownSpaceExtras(principal: MeResponse, share: ShareSettingsRead): ToolbarExtra[] {
  return [
    { key: 'share', weight: CHIP_WEIGHT.share, node: <ShareChip read={share} /> },
    { key: 'contact', weight: CHIP_WEIGHT.contact, node: <ContactChip /> },
    {
      key: 'passkey',
      weight: CHIP_WEIGHT.passkey,
      node: <PasskeyChip initiallyEnrolled={principal.passkeyCount > 0} />,
    },
  ];
}
