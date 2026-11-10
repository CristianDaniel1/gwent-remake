# ADR 002: Monorepo com pnpm workspaces e internal packages

**Status:** aceito

## Decisão

- `apps/web`, `apps/server` (futuro), `packages/engine`, `packages/shared`, `packages/config`.
- `engine` e `shared` exportam TS direto (`exports: ./src/index.ts`), sem build próprio.
- Direção das dependências (verificada no ESLint com `eslint-plugin-boundaries`):
  `web/server → shared → engine`. Imports só pela API pública (`@gwent/<pkg>`).
- TypeScript fixado em 6.0 até o typescript-eslint suportar o TS 7.
