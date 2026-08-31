/**
 * @jest-environment node
 *
 * Guards the CI workflow against a dropped check step and against the pinned Node major
 * drifting outside `engines.node`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const WORKFLOW_PATH = join(ROOT, '.github', 'workflows', 'ci.yml');

const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  engines: { node: string };
  scripts: Record<string, string>;
};

const VERIFICATION_SCRIPTS = ['type-check', 'lint:js', 'lint:css', 'test'] as const;

const runCommands = [...workflow.matchAll(/^\s*run: (.+)$/gm)].map(match =>
  (match[1] ?? '').trim()
);

/** True when a `run:` step invokes `npm <script>`. The boundary stops `lint:js:fix` matching `lint:js`. */
function invokesScript(script: string): boolean {
  const pattern = new RegExp(String.raw`^npm (run )?${script}(\s|$)`);
  return runCommands.some(command => pattern.test(command));
}

/** Evaluates a major against an `engines`-style range such as `">=20 <23"`. */
function majorSatisfies(major: number, range: string): boolean {
  const comparators = [...range.matchAll(/(>=|<=|>|<)\s*(\d+)/g)];
  expect(comparators.length).toBeGreaterThan(0);

  return comparators.every(([, operator, bound]) => {
    const value = Number(bound);
    if (operator === '>=') return major >= value;
    if (operator === '<=') return major <= value;
    if (operator === '>') return major > value;
    return major < value;
  });
}

describe('CI workflow', () => {
  it.each(VERIFICATION_SCRIPTS)('runs the %s script', script => {
    expect(packageJson.scripts[script]).toBeDefined();
    expect(invokesScript(script)).toBe(true);
  });

  it('installs from the lockfile rather than resolving fresh', () => {
    expect(runCommands).toContain('npm ci');
  });

  it('runs on pull requests', () => {
    expect(workflow).toMatch(/^\s*pull_request:/m);
  });

  it('pins a Node major that satisfies engines.node', () => {
    const pinned = /node-version: '(\d+)'/.exec(workflow);
    expect(pinned).not.toBeNull();

    const major = Number(pinned?.[1]);
    expect(majorSatisfies(major, packageJson.engines.node)).toBe(true);
  });
});
