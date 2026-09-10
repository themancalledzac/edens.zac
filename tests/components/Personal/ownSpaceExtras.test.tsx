import { ContactChip } from '@/app/components/Personal/ContactChip';
import { ownSpaceExtras } from '@/app/components/Personal/ownSpaceExtras';
import { PasskeyChip } from '@/app/components/Personal/PasskeyChip';
import { ShareChip } from '@/app/components/Personal/ShareChip';
import { CHIP_WEIGHT } from '@/app/components/ui/FilterToolbar/chipWeights';
import { type MeResponse } from '@/app/types/Auth';

const principal: MeResponse = {
  email: 'c@x.com',
  isAdmin: false,
  mfaSatisfied: true,
  passkeyCount: 0,
  galleries: [],
};
const share = { ok: false as const };

describe('ownSpaceExtras', () => {
  it('builds Share, Contact and Face / Touch ID with their weights', () => {
    const extras = ownSpaceExtras(principal, share);
    expect(extras.map(e => [e.key, e.weight, (e.node as { type: unknown }).type])).toEqual([
      ['share', CHIP_WEIGHT.share, ShareChip],
      ['contact', CHIP_WEIGHT.contact, ContactChip],
      ['passkey', CHIP_WEIGHT.passkey, PasskeyChip],
    ]);
  });

  it('tells the passkey chip whether a passkey already exists', () => {
    const [, , passkey] = ownSpaceExtras({ ...principal, passkeyCount: 2 }, share);
    expect(
      (passkey!.node as { props: { initiallyEnrolled: boolean } }).props.initiallyEnrolled
    ).toBe(true);
  });
});
