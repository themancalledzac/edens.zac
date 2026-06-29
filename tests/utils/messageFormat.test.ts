import { gmailReplyUrl, relative, truncateWords } from '@/app/utils/messageFormat';

describe('relative', () => {
  it('returns minutes ago for differences under 60 minutes', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(relative(tenMinutesAgo)).toMatch(/10 minutes ago/);
  });

  it('returns hours ago for differences between 1 and 24 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(relative(threeHoursAgo)).toMatch(/3 hours ago/);
  });

  it('returns days ago for differences of 24+ hours', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    expect(relative(twoDaysAgo)).toMatch(/2 days ago/);
  });

  it('treats a non-Z iso string as UTC by appending Z', () => {
    const nowUtc = new Date().toISOString().replace('Z', '');
    const result = relative(nowUtc);
    expect(result).toMatch(/this minute/i);
  });

  it('does not double-append Z when input already ends with Z', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(iso.endsWith('Z')).toBe(true);
    expect(relative(iso)).toMatch(/5 minutes ago/);
  });
});

describe('gmailReplyUrl', () => {
  it('returns a Gmail compose URL', () => {
    const url = gmailReplyUrl('user@example.com');
    expect(url.startsWith('https://mail.google.com/mail/')).toBe(true);
  });

  it('includes view=cm in the query string', () => {
    const url = gmailReplyUrl('user@example.com');
    expect(url).toContain('view=cm');
  });

  it('encodes the to param with the given email', () => {
    const url = gmailReplyUrl('user+tag@example.com');
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('to')).toBe('user+tag@example.com');
  });

  it('sets the subject to Re: your message', () => {
    const url = gmailReplyUrl('a@b.com');
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('su')).toBe('Re: your message');
  });
});

describe('truncateWords', () => {
  it('returns text unchanged when under the word limit', () => {
    expect(truncateWords('hello world', 10)).toBe('hello world');
  });

  it('returns text unchanged when exactly at the word limit', () => {
    expect(truncateWords('one two three', 3)).toBe('one two three');
  });

  it('truncates and appends ellipsis when over the word limit', () => {
    expect(truncateWords('one two three four five', 3)).toBe('one two three…');
  });

  it('returns empty string for empty input', () => {
    expect(truncateWords('')).toBe('');
  });

  it('returns empty string for blank/whitespace-only input', () => {
    expect(truncateWords('   ')).toBe('');
  });

  it('collapses multiple spaces between words', () => {
    expect(truncateWords('one   two   three', 10)).toBe('one two three');
  });

  it('uses a default maxWords of 10', () => {
    const words = Array.from({ length: 12 }, (_, i) => `word${i + 1}`);
    const result = truncateWords(words.join(' '));
    expect(result).toBe('word1 word2 word3 word4 word5 word6 word7 word8 word9 word10…');
  });
});
