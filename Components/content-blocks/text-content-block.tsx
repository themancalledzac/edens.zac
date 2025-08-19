/**
 * TextContentBlock — SSR text renderer
 *
 * Server component. Renders plain text or basic markdown-like content without external deps.
 *
 * Expected block shape (flexible):
 * - type: 'TEXT'
 * - content | text | value — the textual content
 * - format?: 'plain' | 'markdown' | 'html' (html treated as plain for safety here)
 * - align?: 'start' | 'center' | 'end'
 * - caption? not used here
 */

import { type TextBlock } from '@/types/ContentBlock';

export type TextContentBlockProps = {
  block: TextBlock;
  className?: string;
};

function pickText(b: TextBlock) {
  if (typeof b.content === 'string') return b.content;
  if (typeof b.text === 'string') return b.text;
  if (typeof b.value === 'string') return b.value;
  return '';
}

// Minimal, safe markdown handling for a handful of cases without deps
function renderBasicMarkdown(input: string) {
  // Extremely conservative: handle **bold**, *italic*, `code` and line breaks
  const parts: Array<{ key: string; el: JSX.Element | string }> = [];
  let remaining = input;
  let idx = 0;

  const pushText = (t: string) => {
    if (!t) return;
    parts.push({ key: `t-${idx++}`, el: t });
  };

  // naive parsing loop; not covering nested or complex cases
  const patterns: Array<{ re: RegExp; wrap: (c: string) => JSX.Element }> = [
    { re: /\*\*(.+?)\*\*/, wrap: (c) => <strong>{c}</strong> },
    { re: /\*(.+?)\*/, wrap: (c) => <em>{c}</em> },
    { re: /`(.+?)`/, wrap: (c) => <code style={{ background: '#f6f8fa', padding: '0 4px', borderRadius: 4 }}>{c}</code> },
  ];

  while (remaining.length > 0) {
    let matched = false;
    for (const { re, wrap } of patterns) {
      const m = remaining.match(re);
      if (m && typeof m.index === 'number') {
        const before = remaining.slice(0, m.index);
        const content = m[1];
        const after = remaining.slice(m.index + m[0].length);
        pushText(before);
        parts.push({ key: `md-${idx++}`, el: wrap(content) });
        remaining = after;
        matched = true;
        break;
      }
    }
    if (!matched) {
      pushText(remaining);
      break;
    }
  }

  // Split by newlines to paragraphs
  const joined = parts.map((p) => p.el);
  const paragraphs = String(joined as unknown as string).split(/\n{2,}/g);
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  };
  return paragraphs.map((para) => {
    const pKey = `p-${hash(para)}`;
    const lines = para.split(/\n/g);
    return (
      <p key={pKey} style={{ margin: '0.5rem 0' }}>
        {lines.reduce<JSX.Element[]>((acc, line) => {
          const prevText = acc.filter((el) => typeof el === 'object' && (el as any).type === 'span').map((el) => (el as any).props.children as string).join('\n');
          const offsetKey = hash(prevText);
          if (acc.length > 0) acc.push(<br key={`br-${pKey}-${offsetKey}`} />);
          acc.push(<span key={`ln-${pKey}-${hash(line)}-${offsetKey}`}>{line}</span>);
          return acc;
        }, [])}
      </p>
    );
  });
}

export default function TextContentBlock({ block, className }: TextContentBlockProps) {
  const text = pickText(block);
  if (!text) return null;

  const align = block.align ?? 'start';
  const format = block.format ?? 'plain';

  return (
    <div className={className} style={{ textAlign: align as any }}>
      {format === 'markdown' ? renderBasicMarkdown(text) : (
        <p style={{ whiteSpace: 'pre-wrap', margin: '0.5rem 0' }}>{text}</p>
      )}
    </div>
  );
}
