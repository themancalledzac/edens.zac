/**
 * Reports `//` and `/* *\/` comments that sit inside a function body.
 *
 * CLAUDE.md bans prose beside code: the why belongs in the docblock of the function it explains,
 * and a function whose docblock would not fit should be split instead. This rule is the
 * enforcement half of that standard (board item G2a) and reports what G2b will migrate.
 *
 * Three things are deliberately not reported: tooling directives, which are instructions rather
 * than prose; anything outside a function body, which is where docblocks belong; and a JSDoc
 * block documenting a declaration nested inside a function, since that is a docblock in the
 * right place that merely happens to be nested.
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

/**
 * Whether `comment` is a JSDoc block sitting immediately above a declaration.
 *
 * Keyed on the declaration starting at the very next token, so a docblock separated from its
 * subject by a statement is still reported.
 */
function documentsDeclaration(sourceCode, comment) {
  if (comment.type !== 'Block' || !comment.value.startsWith('*')) return false;

  const token = sourceCode.getTokenAfter(comment, { includeComments: false });
  if (!token) return false;

  let node = sourceCode.getNodeByRangeIndex(token.range[0]);
  while (node) {
    if (DECLARATION_TYPES.has(node.type)) return node.range[0] === token.range[0];
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

          const [start, end] = comment.range;
          if (bodies.some(([bodyStart, bodyEnd]) => start > bodyStart && end < bodyEnd)) {
            context.report({ loc: comment.loc, messageId: 'inline' });
          }
        }
      },
    };
  },
};
