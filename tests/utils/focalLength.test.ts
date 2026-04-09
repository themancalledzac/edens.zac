import { classifyFocalLength, getLensType, parseFocalLength } from '@/app/utils/focalLength';

describe('parseFocalLength', () => {
  it('parses "50mm"', () => {
    expect(parseFocalLength('50mm')).toBe(50);
  });

  it('parses "50 mm" with space', () => {
    expect(parseFocalLength('50 mm')).toBe(50);
  });

  it('parses "50.0mm" with decimal', () => {
    expect(parseFocalLength('50.0mm')).toBe(50);
  });

  it('parses bare number "50"', () => {
    expect(parseFocalLength('50')).toBe(50);
  });

  it('parses "24.5mm"', () => {
    expect(parseFocalLength('24.5mm')).toBe(24.5);
  });

  it('returns null for null', () => {
    expect(parseFocalLength(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseFocalLength()).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseFocalLength('')).toBeNull();
  });

  it('returns null for value below 4mm', () => {
    expect(parseFocalLength('2mm')).toBeNull();
  });

  it('returns null for value above 2000mm', () => {
    expect(parseFocalLength('2500mm')).toBeNull();
  });

  it('returns 4 at minimum boundary', () => {
    expect(parseFocalLength('4mm')).toBe(4);
  });

  it('returns 2000 at maximum boundary', () => {
    expect(parseFocalLength('2000mm')).toBe(2000);
  });

  it('returns null for non-numeric string', () => {
    expect(parseFocalLength('wide')).toBeNull();
  });
});

describe('classifyFocalLength', () => {
  it('classifies < 35 as wide', () => {
    expect(classifyFocalLength(24)).toBe('wide');
    expect(classifyFocalLength(16)).toBe('wide');
    expect(classifyFocalLength(34)).toBe('wide');
  });

  it('classifies 35 as normal (boundary)', () => {
    expect(classifyFocalLength(35)).toBe('normal');
  });

  it('classifies 35-70 as normal', () => {
    expect(classifyFocalLength(50)).toBe('normal');
    expect(classifyFocalLength(70)).toBe('normal');
  });

  it('classifies > 70 as telephoto', () => {
    expect(classifyFocalLength(71)).toBe('telephoto');
    expect(classifyFocalLength(85)).toBe('telephoto');
    expect(classifyFocalLength(200)).toBe('telephoto');
    expect(classifyFocalLength(400)).toBe('telephoto');
  });
});

describe('getLensType', () => {
  it('returns wide for "24mm"', () => {
    expect(getLensType('24mm')).toBe('wide');
  });

  it('returns normal for "50mm"', () => {
    expect(getLensType('50mm')).toBe('normal');
  });

  it('returns telephoto for "200mm"', () => {
    expect(getLensType('200mm')).toBe('telephoto');
  });

  it('returns null for null input', () => {
    expect(getLensType(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getLensType()).toBeNull();
  });

  it('returns null for unparseable string', () => {
    expect(getLensType('wide')).toBeNull();
  });
});
