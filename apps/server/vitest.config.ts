import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC emits the decorator metadata that Nest dependency injection needs
// (Vitest's default esbuild does not).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./test/global-setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.e2e.test.ts'],
    hookTimeout: 30_000,
  },
});
