import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const globals = readFileSync(join(process.cwd(), 'app/styles/globals.css'), 'utf8');

/**
 * Reads the value a custom property is declared with in globals.css.
 */
function tokenValue(name: string): string | undefined {
  return new RegExp(String.raw`${name}:\s*([^;]+);`).exec(globals)?.[1]?.trim();
}

describe('radius tokens', () => {
  it('should square chips and tiles through --radius-1', () => {
    expect(tokenValue('--radius-0')).toBe('0');
    expect(tokenValue('--radius-1')).toBe('0');
  });

  it('should resolve --radius-sm to zero', () => {
    expect(['0', 'var(--radius-1)']).toContain(tokenValue('--radius-sm'));
  });

  it('should keep --radius-2 at 8px and --radius-round at 9999px', () => {
    expect(tokenValue('--radius-2')).toBe('8px');
    expect(tokenValue('--radius-round')).toBe('9999px');
  });
});
