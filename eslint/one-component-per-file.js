/**
 * Allows a single React component per .tsx file. A component is a top-level PascalCase
 * binding to a function (or to memo/forwardRef of one). Compound-component patterns can
 * opt out with an eslint-disable comment that says why.
 */
const WRAPPERS = new Set(['memo', 'forwardRef']);

const calleeName = (callee) =>
  callee.type === 'Identifier'
    ? callee.name
    : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
      ? callee.property.name
      : null;

const isFunctionLike = (node) =>
  !!node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    (node.type === 'CallExpression' &&
      WRAPPERS.has(calleeName(node.callee)) &&
      isFunctionLike(node.arguments[0])));

const isComponentName = (name) => /^[A-Z][a-z0-9]/.test(name);

const componentsIn = (statement) => {
  const node =
    statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
      ? statement.declaration
      : statement;
  if (!node) return [];
  if (node.type === 'FunctionDeclaration')
    return node.id && isComponentName(node.id.name) ? [node.id] : [];
  if (node.type !== 'VariableDeclaration') return [];
  return node.declarations
    .filter(
      (d) => d.id.type === 'Identifier' && isComponentName(d.id.name) && isFunctionLike(d.init),
    )
    .map((d) => d.id);
};

export const oneComponentPerFile = {
  meta: {
    type: 'suggestion',
    docs: { description: 'One React component per file' },
    messages: {
      extra: 'Move "{{name}}" to its own file: only one component per file ("{{first}}" is here).',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(program) {
        const [first, ...rest] = program.body.flatMap(componentsIn);
        for (const id of rest)
          context.report({
            node: id,
            messageId: 'extra',
            data: { name: id.name, first: first.name },
          });
      },
    };
  },
};
