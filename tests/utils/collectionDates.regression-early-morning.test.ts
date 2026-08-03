// Timezone pinned at module level for reliable regression detection
// TZ=Asia/Tokyo (UTC+9): allows early-morning times to shift backward into previous day
process.env.TZ = 'Asia/Tokyo';

import { captureDayKey } from '@/app/utils/collectionDates';

describe('captureDayKey - early-morning regression (UTC+9 timezone)', () => {
  let originalTZ: string | undefined;

  beforeAll(() => {
    originalTZ = process.env.TZ;
  });

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  it('does NOT shift an early-morning capture into the previous day', () => {
    // Regression test: A Date-based implementation using
    // new Date('2026-07-20T00:15:00').toISOString().slice(0, 10)
    // parses ISO string without timezone as local time, then converts to UTC.
    //
    // In Asia/Tokyo (UTC+9):
    // - Input string '2026-07-20T00:15:00' is interpreted as local time: 2026-07-20 00:15 JST
    // - Converting to UTC: subtract 9 hours = 2026-07-19 15:15 UTC
    // - toISOString() returns '2026-07-19T15:15:00Z'
    // - slice(0, 10) returns '2026-07-19' (WRONG - shifted to previous day)
    //
    // Our string-slice implementation preserves the literal date: '2026-07-20'
    expect(captureDayKey('2026-07-20T00:15:00')).toBe('2026-07-20');
  });
});
