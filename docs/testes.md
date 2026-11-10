# Testes

O projeto tem três camadas de teste, do mais rápido para o mais completo:

| Camada                    | Ferramenta                            | Onde fica                        | O que cobre                                                                  |
| ------------------------- | ------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Unitários e de componente | Vitest + Testing Library              | `*.test.ts(x)` ao lado do código | regras do engine, bot, schemas, stores, componentes React                    |
| API e tempo real          | Vitest + Supertest + socket.io-client | `apps/server/test/*.e2e.test.ts` | rotas HTTP com banco real, partida inteira por Socket.IO                     |
| Ponta a ponta (e2e)       | Playwright + axe                      | `e2e/*.spec.ts`                  | o jogo no navegador: partidas, replay, multiplayer, controle, acessibilidade |

## Resumo dos comandos

| Comando           | O que faz                                                                    |
| ----------------- | ---------------------------------------------------------------------------- |
| `pnpm test`       | todos os testes do Vitest (engine, shared, web e server)                     |
| `pnpm test:watch` | Vitest em modo watch (roda de novo ao salvar)                                |
| `pnpm e2e`        | todos os testes do Playwright                                                |
| `pnpm e2e:ui`     | Playwright no modo interativo (ver cada passo, repetir um teste)             |
| `pnpm e2e:report` | abre o relatório HTML da última execução                                     |
| `pnpm verify`     | formatação + lint + tipos + testes unitários + build (o mesmo que o CI roda) |
| `pnpm verify:all` | `verify` + e2e                                                               |

## Preparação (uma vez)

```bash
pnpm install
pnpm e2e:install     # baixa o Chromium do Playwright
pnpm db:setup        # opcional: .env + Postgres no Docker + migrações
```

- **Sem Docker/Postgres**, tudo roda do mesmo jeito, mas os testes que precisam do servidor são
  **pulados** (aparece um aviso): API (`apps/server/test/api.e2e.test.ts`), `e2e/online.spec.ts` e
  `e2e/multiplayer.spec.ts`.

## Testes unitários (Vitest)

```bash
pnpm test                                    # tudo
pnpm exec vitest run packages/engine         # um pacote
pnpm exec vitest run src/ai/difficulty       # arquivos cujo caminho contém o texto
pnpm exec vitest run -t "passes when"        # testes cujo nome contém o texto
pnpm test:watch                              # modo watch
```

- A configuração da raiz (`vitest.config.ts`) roda cada pacote como um projeto, com a configuração
  dele (o web usa jsdom e MSW; o server usa SWC por causa dos decorators do Nest).
- **Web:** a API é simulada com MSW (`apps/web/src/test/msw.ts`, padrão: servidor fora do ar).
  Use `renderWithProviders` (`apps/web/src/test/render.tsx`), que monta os mesmos providers do app;
  a opção `route` renderiza uma página numa rota (para páginas que leem parâmetros da URL).
- **Engine:** monte o tabuleiro com `scenario()` e jogue com `act()` (ver `docs/mecanicas.md`).
  A simulação (`core/simulation.test.ts`) joga centenas de partidas aleatórias conferindo as
  invariantes; o teste do bot joga 1000 partidas. Esses dois levam alguns segundos.
- **Server:** os testes de API usam um banco só de testes (`gwent_test`), criado e migrado
  automaticamente; o banco de desenvolvimento nunca é tocado.

## Testes e2e (Playwright)

```bash
pnpm e2e                          # tudo (sobe o Vite na porta 5180 e, com Postgres, o server na 3000)
pnpm e2e replay                   # arquivos cujo nome contém "replay"
pnpm e2e --grep "hard bot"        # testes cujo nome contém o texto
pnpm e2e --repeat-each=3          # repetir (bom para caçar testes instáveis)
pnpm e2e:ui                       # modo interativo
```

- O `playwright.config.ts` sobe os servidores sozinho. Se o contêiner `gwent-postgres` estiver
  saudável, ele também compila e sobe o server (banco `gwent_test`, no mesmo Postgres do
  `DATABASE_URL` de `apps/server/.env`); senão, os testes de servidor
  são pulados.
- Os testes usam o jogo em **pt-BR** (os seletores procuram os textos da tela, como
  `'Terminar troca'`), viewport de 1600×900 e seeds fixas (`/game?seed=7`) para as partidas serem
  sempre iguais.
- `e2e/helpers.ts` → `playWholeMatch(page)` joga uma partida inteira pela interface (troca,
  escolhas, jogadas e passes) e confere que não houve erros no console. É usado pelos testes de
  partida, replay, online e multiplayer.
- Um controle de videogame é simulado substituindo `navigator.getGamepads` (`e2e/gamepad.spec.ts`).

### Quando um e2e falha

1. A saída mostra o passo que falhou e onde está o **trace** (`test-results/.../trace.zip`):
   `pnpm exec playwright show-trace <arquivo>` mostra cada passo com screenshot, DOM e console.
2. `pnpm e2e:report` abre o relatório HTML.
3. Testes com várias páginas (multiplayer) só gravam o trace da página principal; quando a partida
   trava, o helper imprime o que a outra página está vendo (`[stuck ...]`).
4. `E2E_DEBUG=1 pnpm e2e` imprime os avisos do console das páginas.
5. A máquina muito carregada deixa tudo mais lento: rode só o teste com problema, ou com menos
   workers (`pnpm e2e --workers=2`).

## Convenções de nomes

Todo o código e os testes ficam em inglês (os textos da interface procurados nos testes continuam
em pt-BR, porque são o que aparece na tela).

- **Unitários:** `describe('<unidade testada>')` + `it('<faz algo> when <condição>')`, no presente,
  descrevendo o comportamento, não a implementação:
  `it('passes when the opponent has passed and the bot is winning')`.
- **e2e:** o fluxo do ponto de vista do usuário:
  `test('player can finish a full match against the bot (seed 7)')`,
  `test('a spectator can watch a live match without seeing any hand')`.
- Prefira seletores acessíveis (`getByRole`, `getByLabel`); use `data-*` só quando não houver um
  nome visível (ex.: `[data-target]` marca os alvos de jogada).

## Automação

- **Antes de cada commit** (husky + lint-staged): ESLint e Prettier nos arquivos alterados, e o
  commitlint confere a mensagem (Conventional Commits: `feat: ...`, `fix: ...`).
- **Antes de cada push**: `pnpm typecheck && pnpm test` (`.husky/pre-push`).
- **CI** (`.github/workflows/ci.yml`, a cada push na `main` e em pull requests):
  1. `checks`: `pnpm db:setup` (Postgres no Docker do runner) + `pnpm verify`;
  2. `e2e`: sobe o Postgres, instala o Chromium e roda `pnpm e2e`. Em caso de falha, o relatório e os traces ficam nos artefatos da
     execução.
