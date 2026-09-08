/**
 * @jest-environment node
 *
 * The inline-comment lint rule (board item G2a).
 *
 * Two things are worth pinning. The rule has to fire on prose inside a function body without
 * firing on the three things CLAUDE.md still allows there — tooling directives, docblocks above
 * declarations, and anything outside a function — because a false positive on a directive would
 * make the rule unusable the moment it flips to `error`. And both blocks have to stay `warn`
 * until the migration lands, or CI fails on 2,892 untouched comments.
 *
 * `RuleTester.run` registers its own `describe`/`it` pair, so it is called at module scope
 * rather than from inside a test.
 */

import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

import { noInlineCommentsInFunctions } from '@/eslint-rules/no-inline-comments-in-functions.js';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser as never,
    parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
  },
});

ruleTester.run('no-inline-comments-in-functions', noInlineCommentsInFunctions as never, {
  valid: [
    { name: 'a comment at module scope', code: '// module scope\nconst a = 1;' },
    {
      name: 'a docblock above a function',
      code: '/** A docblock. */\nfunction f() {\n  return 1;\n}',
    },
    {
      name: 'an eslint directive',
      code: 'function f() {\n  // eslint-disable-next-line no-console\n  console.log(1);\n}',
    },
    {
      name: 'a ts directive',
      code: 'function f() {\n  // @ts-expect-error deliberate\n  return g();\n}',
    },
    {
      name: 'a prettier directive',
      code: 'function f() {\n  // prettier-ignore\n  const m = [1, 2];\n  return m;\n}',
    },
    {
      name: 'a docblock above a nested function declaration',
      code: 'function outer() {\n  /** Doc. */\n  function inner() {\n    return 1;\n  }\n  return inner();\n}',
    },
    {
      name: 'a docblock above a nested const',
      code: 'function outer() {\n  /** Doc. */\n  const inner = 1;\n  return inner;\n}',
    },
    {
      name: 'a comment in a module-scope object literal',
      code: 'const o = {\n  // not in a function\n  a: 1,\n};',
    },
  ],
  invalid: [
    {
      name: 'a line comment in a function body',
      code: 'function f() {\n  // why\n  return 1;\n}',
      errors: [{ messageId: 'inline' }],
    },
    {
      name: 'a line comment in an arrow body',
      code: 'const f = () => {\n  // why\n  return 1;\n};',
      errors: [{ messageId: 'inline' }],
    },
    {
      name: 'a trailing comment',
      code: 'function f() {\n  return 1; // why\n}',
      errors: [{ messageId: 'inline' }],
    },
    {
      name: 'a non-JSDoc block comment',
      code: 'function f() {\n  /* why */\n  return 1;\n}',
      errors: [{ messageId: 'inline' }],
    },
    {
      name: 'a docblock attached to no declaration',
      code: 'function f() {\n  /** why */\n  return 1;\n}',
      errors: [{ messageId: 'inline' }],
    },
    {
      name: 'a comment in a class method',
      code: 'class C {\n  m() {\n    // why\n    return 1;\n  }\n}',
      errors: [{ messageId: 'inline' }],
    },
    {
      name: 'a comment inside a test case',
      code: 'describe("x", () => {\n  it("y", () => {\n    // why\n    expect(1).toBe(1);\n  });\n});',
      errors: [{ messageId: 'inline' }],
    },
    {
      name: 'each line of a multi-line comment block',
      code: 'function f() {\n  // one\n  // two\n  return 1;\n}',
      errors: [{ messageId: 'inline' }, { messageId: 'inline' }],
    },
  ],
});

describe('eslint.config.mjs — the G2a blocks', () => {
  type ConfigBlock = { files?: string[]; rules?: Record<string, unknown> };

  async function g2aBlock(): Promise<ConfigBlock> {
    const config = (await import('@/eslint.config.mjs')).default as ConfigBlock[];
    const block = config.find(b => b.rules?.['local/no-inline-comments-in-functions']);
    if (!block) throw new Error('no block registers the inline-comment rule');
    return block;
  }

  it('covers both source trees, and only those', async () => {
    const block = await g2aBlock();
    expect(block.files).toEqual(['app/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}']);
  });

  it('bans JSX comments in the same block', async () => {
    const block = await g2aBlock();
    const restricted = block.rules?.['no-restricted-syntax'] as [string, { selector: string }];
    expect(restricted[1].selector).toBe('JSXExpressionContainer > JSXEmptyExpression');
  });

  /**
   * The migration is 2,892 comments across 247 files. Flipping either of these to `error` before
   * G2b-app and G2b-tests both merge fails CI on files nobody touched, which is how a rule like
   * this gets reverted instead of adopted.
   */
  it('stays at warn until the migration lands', async () => {
    const block = await g2aBlock();
    expect(block.rules?.['local/no-inline-comments-in-functions']).toBe('warn');
    expect((block.rules?.['no-restricted-syntax'] as [string])[0]).toBe('warn');
  });
});
