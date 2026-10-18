/**
 * @jest-environment node
 */

/**
 * The token guard in `.stylelintrc` (`declaration-property-value-disallowed-list`) keeps raw hex
 * and rgb() colours and raw px sizes out of module stylesheets. This runs the real stylelint CLI
 * with the repo config over sample stylesheets, so removing or loosening the rule fails here.
 * A clean lint prints nothing, which reads as no warnings.
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const RULE = 'declaration-property-value-disallowed-list';
const STYLELINT = join(process.cwd(), 'node_modules/.bin/stylelint');

interface StylelintWarning {
  rule: string;
  line: number;
}

function guardWarnings(source: string): StylelintWarning[] {
  let output: string;
  try {
    output = execFileSync(
      STYLELINT,
      ['--stdin-filename', 'app/components/Sample/Sample.module.scss', '--formatter', 'json'],
      { input: source, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string };
    output = failed.stdout || failed.stderr || '[]';
  }
  const results = JSON.parse(output.trim() || '[]') as { warnings: StylelintWarning[] }[];
  return results.flatMap(result => result.warnings).filter(warning => warning.rule === RULE);
}

describe('stylelint token guard', () => {
  it.each([
    ['a hex colour', '.a {\n  color: #fff;\n}\n'],
    ['an rgb() background', '.a {\n  background: rgb(0 0 0 / 50%);\n}\n'],
    ['a hex border colour', '.a {\n  border: 1px solid #e5e5e5;\n}\n'],
    ['a px font-size', '.a {\n  font-size: 14px;\n}\n'],
    ['a px padding', '.a {\n  padding: 8px var(--space-2);\n}\n'],
    ['a px gap', '.a {\n  gap: 12px;\n}\n'],
    ['a px margin', '.a {\n  margin-bottom: 16px;\n}\n'],
    ['a px border-radius', '.a {\n  border-radius: 3px;\n}\n'],
  ])('reports %s', (_label, source) => {
    expect(guardWarnings(source)).toHaveLength(1);
  });

  it.each([
    ['a token hairline', '.a {\n  border: 1px solid var(--color-border);\n}\n'],
    ['a zero margin', '.a {\n  margin: 0;\n}\n'],
    ['a 0px padding', '.a {\n  padding: 0px;\n}\n'],
    ['a token font-size', '.a {\n  font-size: var(--text-sm);\n}\n'],
    ['a px width', '.a {\n  width: 20px;\n}\n'],
    ['a token-derived calc', '.a {\n  padding: calc(var(--space-1) / 2);\n}\n'],
  ])('allows %s', (_label, source) => {
    expect(guardWarnings(source)).toHaveLength(0);
  });
});
