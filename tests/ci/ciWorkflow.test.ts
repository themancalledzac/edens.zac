/**
 * @jest-environment node
 *
 * Guards the CI workflow against the two ways it can quietly stop being verification.
 *
 * A dropped check step is the first. The workflow exists so that `type-check`, `lint:js`,
 * `lint:css` and `test` stop being local-only claims; a workflow that installs dependencies
 * and asserts nothing is a green badge over an unverified tree, which is worse than no badge
 * because it is trusted. Each script is matched as an invoked command rather than as a
 * substring, so `lint:js:fix` cannot stand in for `lint:js`.
 *
 * A drifting Node pin is the second. CI passing on a runtime the repo does not claim to
 * support proves nothing about the runtime it does, and the drift is invisible in a diff
 * that touches only one of the two files. The bound is read from `engines.node` rather than
 * hardcoded, so widening the supported range is a one-file change and narrowing it below the
 * pinned version fails here.
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

/**
 * True when some `run:` step invokes `npm <script>` or `npm run <script>` as the command
 * itself. The trailing boundary keeps a longer script name from satisfying a shorter one.
 */
function invokesScript(script: string): boolean {
  const pattern = new RegExp(String.raw`^npm (run )?${script}(\s|$)`);
  return runCommands.some(command => pattern.test(command));
}

/**
 * Evaluates a major version against the comparators in an `engines`-style range such as
 * `">=20 <23"`. Only major-level comparators are read, which is all this repo pins.
 */
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
