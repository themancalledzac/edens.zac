// Timezone pinned at module level for reliable regression detection
// TZ=America/Los_Angeles (UTC-7): allows late-evening times to shift forward into next day
process.env.TZ = 'America/Los_Angeles';

import { captureDayKey } from '@/app/utils/collectionDates';

describe('captureDayKey - late-evening regression (UTC-7 timezone)', () => {
  let originalTZ: string | undefined;

  beforeAll(() => {
    originalTZ = process.env.TZ;
  });

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('does NOT shift a late-evening capture into the next day', () => {
    // Regression test: A Date-based implementation using
    // new Date('2026-07-20T23:45:00').toISOString().slice(0, 10)
    // parses ISO string without timezone as local time, then converts to UTC.
    //
    // In America/Los_Angeles (UTC-7):
    // - Input string '2026-07-20T23:45:00' is interpreted as local time: 2026-07-20 23:45 PDT
    // - Converting to UTC: add 7 hours = 2026-07-21 06:45 UTC
    // - toISOString() returns '2026-07-21T06:45:00Z'
    // - slice(0, 10) returns '2026-07-21' (WRONG - shifted to next day)
    //
    // Our string-slice implementation preserves the literal date: '2026-07-20'
    expect(captureDayKey('2026-07-20T23:45:00')).toBe('2026-07-20');
  });
});
