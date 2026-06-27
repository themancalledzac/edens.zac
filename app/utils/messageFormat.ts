const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** Returns a human-readable relative time string from an ISO timestamp. */
export function relative(iso: string): string {
  const utc = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  const diffMs = new Date(utc).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RTF.format(hours, 'hour');
  const days = Math.round(hours / 24);
  return RTF.format(days, 'day');
}

/** Returns a Gmail compose URL pre-filled with the given recipient address. */
export function gmailReplyUrl(email: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email,
    su: 'Re: your message',
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Returns the first maxWords words of text, appending '…' if truncated. */
export function truncateWords(text: string, maxWords = 10): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}
