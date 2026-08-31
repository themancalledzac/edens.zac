import {
  classifyFocalLength,
  distinctFocalRanges,
  getFocalRange,
  parseFocalLength,
} from '@/app/utils/focalLength';

describe('parseFocalLength', () => {
  it('parses the space-separated form the metadata editor writes', () => {
    expect(parseFocalLength('24 mm')).toBe(24);
    expect(parseFocalLength('200 mm')).toBe(200);
  });

  it('parses the unspaced and bare forms', () => {
    expect(parseFocalLength('50mm')).toBe(50);
    expect(parseFocalLength('50')).toBe(50);
  });

  it('parses decimals', () => {
    expect(parseFocalLength('25.5 mm')).toBe(25.5);
    expect(parseFocalLength('24.5mm')).toBe(24.5);
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseFocalLength('35MM')).toBe(35);
    expect(parseFocalLength('  35 mm  ')).toBe(35);
  });

  it('returns null for missing or empty values', () => {
    expect(parseFocalLength(null)).toBeNull();
    expect(parseFocalLength()).toBeNull();
    expect(parseFocalLength('')).toBeNull();
  });

  it('returns null for text with no numeric content', () => {
    expect(parseFocalLength('wide')).toBeNull();
    expect(parseFocalLength('mm')).toBeNull();
  });

  it('rejects values outside a realistic lens range', () => {
    expect(parseFocalLength('2mm')).toBeNull();
    expect(parseFocalLength('2500mm')).toBeNull();
  });

  it('accepts the range boundaries themselves', () => {
    expect(parseFocalLength('4mm')).toBe(4);
    expect(parseFocalLength('2000mm')).toBe(2000);
  });
});

describe('classifyFocalLength', () => {
  it('classifies below 35mm as wide', () => {
    expect(classifyFocalLength(16)).toBe('wide');
    expect(classifyFocalLength(24)).toBe('wide');
    expect(classifyFocalLength(34)).toBe('wide');
  });

  it('classifies 35mm through 70mm as normal, boundaries included', () => {
    expect(classifyFocalLength(35)).toBe('normal');
    expect(classifyFocalLength(50)).toBe('normal');
    expect(classifyFocalLength(70)).toBe('normal');
  });

  it('classifies above 70mm as tele', () => {
    expect(classifyFocalLength(71)).toBe('tele');
    expect(classifyFocalLength(200)).toBe('tele');
    expect(classifyFocalLength(400)).toBe('tele');
  });
});

describe('getFocalRange', () => {
  it('maps a stored string straight to its range', () => {
    expect(getFocalRange('24 mm')).toBe('wide');
    expect(getFocalRange('50mm')).toBe('normal');
    expect(getFocalRange('200 mm')).toBe('tele');
  });

  it('returns null when the value cannot be parsed', () => {
    expect(getFocalRange(null)).toBeNull();
    expect(getFocalRange()).toBeNull();
    expect(getFocalRange('wide')).toBeNull();
  });
});

describe('distinctFocalRanges', () => {
  it('returns only the ranges present, in short-to-long order', () => {
    expect(distinctFocalRanges(['200 mm', '24 mm', '50 mm'])).toEqual(['wide', 'normal', 'tele']);
  });

  it('deduplicates', () => {
    expect(distinctFocalRanges(['24 mm', '26 mm', '28 mm'])).toEqual(['wide']);
  });

  it('ignores unparseable and missing values', () => {
    expect(distinctFocalRanges([null, undefined, '', 'wide', '24 mm'])).toEqual(['wide']);
  });

  it('returns nothing for a set that carries no focal length at all', () => {
    expect(distinctFocalRanges([null, null, undefined])).toEqual([]);
  });

  it('separates the two ends of a 24-70mm zoom', () => {
    expect(distinctFocalRanges(['24 mm', '70 mm'])).toEqual(['wide', 'normal']);
  });
});
