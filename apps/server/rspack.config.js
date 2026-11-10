// Bundles the server together with @gwent/engine and @gwent/shared (internal TS packages,
// compiled here by rspack's SWC, with decorator metadata for Nest).
// Every other dependency stays external and is loaded from node_modules at runtime.
const path = require('node:path');
const nodeExternals = require('webpack-node-externals');

module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({
      modulesDir: path.resolve(__dirname, 'node_modules'),
      allowlist: [/^@gwent\//],
    }),
  ],
});
