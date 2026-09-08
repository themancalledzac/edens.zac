/**
 * Reports `//` and `/* *\/` comments that sit inside a function body.
 *
 * CLAUDE.md bans prose beside code: the why belongs in the docblock of the function it explains,
 * and a function whose docblock would not fit should be split instead. This rule is the
 * enforcement half of that standard (board item G2a) and reports what G2b will migrate.
 *
 * Four things are deliberately not reported: tooling directives, which are instructions rather
 * than prose; anything outside a function body, which is where docblocks belong; a JSDoc block
 * documenting a declaration nested inside a function, since that is a docblock in the right place
 * that merely happens to be nested; and a JSDoc block above a `describe`/`it`/`test` call, which
 * is the only docblock a test case can have.
 */

const DIRECTIVE =
  /^\s*(?:eslint\b|eslint-|@ts-|prettier-|globals?\b|istanbul\b|[cv]8\s|@jest-environment\b)/;

const DECLARATION_TYPES = new Set([
  'FunctionDeclaration',
  'VariableDeclaration',
  'ClassDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
]);

const TEST_CALLEES = new Set(['describe', 'it', 'test']);

/**
 * First token after `comment`, or null when `comment` is not a JSDoc block or nothing follows it.
 */
function jsdocSubjectToken(sourceCode, comment) {
  if (comment.type !== 'Block' || !comment.value.startsWith('*')) return null;
  return sourceCode.getTokenAfter(comment, { includeComments: false });
}

/**
 * Root identifier of a callee, unwrapping member, call and tagged-template forms so that
 * `it.each([…])(…)` and ``it.each`…`(…)`` both resolve to `it`. Null for any other shape.
 */
function calleeRoot(node) {
  let current = node;
  while (current) {
    if (current.type === 'Identifier') return current.name;
    if (current.type === 'MemberExpression') current = current.object;
    else if (current.type === 'CallExpression') current = current.callee;
    else if (current.type === 'TaggedTemplateExpression') current = current.tag;
    else return null;
  }
  return null;
}

/**
 * Whether `comment` is a JSDoc block sitting immediately above a declaration.
 *
 * Keyed on the declaration starting at the very next token, so a docblock separated from its
 * subject by a statement is still reported.
 */
function documentsDeclaration(sourceCode, comment) {
  const token = jsdocSubjectToken(sourceCode, comment);
  if (!token) return false;

  let node = sourceCode.getNodeByRangeIndex(token.range[0]);
  while (node) {
    if (DECLARATION_TYPES.has(node.type)) return node.range[0] === token.range[0];
    node = node.parent;
  }
  return false;
}

/**
 * Whether `comment` is a JSDoc block sitting immediately above a `describe`/`it`/`test` call.
 *
 * A test case is an `ExpressionStatement`, not a declaration, so it has nowhere else to put its
 * prose — this exemption is what makes the migration's prescribed destination legal. It is keyed
 * on those three callees rather than on call statements generally, which keeps a docblock above a
 * bare `return` reported.
 */
function documentsTestCase(sourceCode, comment) {
  const token = jsdocSubjectToken(sourceCode, comment);
  if (!token) return false;

  let node = sourceCode.getNodeByRangeIndex(token.range[0]);
  while (node) {
    if (node.type === 'ExpressionStatement') {
      if (node.range[0] !== token.range[0]) return false;
      return (
        node.expression.type === 'CallExpression' &&
        TEST_CALLEES.has(calleeRoot(node.expression.callee))
      );
    }
    node = node.parent;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noInlineCommentsInFunctions = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments inside function bodies; put the why in a docblock instead',
    },
    schema: [],
    messages: {
      inline:
        'No comments inside a function body. Move the why into the docblock of the function it explains, or split the function so it has a docblock to live in.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const bodies = [];

    function record(node) {
      if (node.body?.type === 'BlockStatement') bodies.push(node.body.range);
    }

    return {
      FunctionDeclaration: record,
      FunctionExpression: record,
      ArrowFunctionExpression: record,
      'Program:exit'() {
        for (const comment of sourceCode.getAllComments()) {
          if (DIRECTIVE.test(comment.value)) continue;
          if (documentsDeclaration(sourceCode, comment)) continue;
          if (documentsTestCase(sourceCode, comment)) continue;

          const [start, end] = comment.range;
          if (bodies.some(([bodyStart, bodyEnd]) => start > bodyStart && end < bodyEnd)) {
            context.report({ loc: comment.loc, messageId: 'inline' });
          }
        }
      },
    };
  },
};
