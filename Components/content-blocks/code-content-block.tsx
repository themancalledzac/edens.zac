/**
 * CodeContentBlock — SSR code renderer with semantics-first markup
 *
 * Server component. No client-side highlighter by design for Phase 5.4.
 * Adds BEM-like class hooks for future progressive enhancement.
 *
 * Expected block shape:
 * - type: 'CODE'
 * - code | content | text — source code string
 * - language?: string (e.g., 'ts', 'tsx', 'js', 'java', 'bash')
 * - filename?: string (optional header)
 */

import { type CodeBlock } from '@/types/ContentBlock';

export type CodeContentBlockProps = {
  block: CodeBlock;
  className?: string;
};

function pickCode(b: CodeBlock) {
  if (typeof b.code === 'string') return b.code;
  if (typeof b.content === 'string') return b.content;
  if (typeof b.text === 'string') return b.text;
  return '';
}

export default function CodeContentBlock({ block, className }: CodeContentBlockProps) {
  const code = pickCode(block);
  if (!code) return null;

  const language = typeof block.language === 'string' && block.language.trim() ? block.language.trim() : 'plaintext';
  const filename = typeof block.filename === 'string' ? block.filename : undefined;

  return (
    <figure className={className} style={{ margin: 0 }}>
      {filename ? (
        <figcaption style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{filename}</figcaption>
      ) : null}
      <pre className={`cb cb--pre language-${language}`} style={{ background: '#0b1020', color: '#d6e2ff', padding: '0.75rem 1rem', borderRadius: 8, overflow: 'auto' }}>
        <code className={`cb__code language-${language}`}>
          {code}
        </code>
      </pre>
    </figure>
  );
}
