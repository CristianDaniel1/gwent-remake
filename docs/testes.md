# Testes

O projeto tem três camadas de teste, do mais rápido para o mais completo:

| Camada                    | Ferramenta                            | Onde fica                        | O que cobre                                                                  |
| ------------------------- | ------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Unitários e de componente | Vitest + Testing Library              | `*.test.ts(x)` ao lado do código | regras do engine, bot, schemas, stores, componentes React                    |
| API e tempo real          | Vitest + Supertest + socket.io-client | `apps/server/test/*.e2e.test.ts` | rotas HTTP com banco real, partida inteira por Socket.IO                     |
| Ponta a ponta (e2e)       | Playwright + axe                      | `e2e/specs/*.spec.ts`            | o jogo no navegador: partidas, replay, multiplayer, controle, acessibilidade |

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

- **Sem Docker/Postgres**, tudo roda do mesmo jeito, mas os testes que precisam do servidor ficam de
  fora: a API (`apps/server/test/api.e2e.test.ts`, pulada com um aviso) e os e2e com a tag
  `@server` (histórico e multiplayer).

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
pnpm e2e --grep-invert @slow      # sem os testes que jogam partidas inteiras (bem mais rápido)
pnpm e2e --grep @server           # só os testes que usam o servidor
pnpm e2e --repeat-each=3          # repetir (bom para caçar testes instáveis)
pnpm e2e:ui                       # modo interativo
```

- O `playwright.config.ts` sobe os servidores sozinho. Se o contêiner `gwent-postgres` estiver
  saudável, ele também compila e sobe o server (banco `gwent_test`, no mesmo Postgres do
  `DATABASE_URL` de `apps/server/.env`); senão, os testes com a tag `@server` ficam de fora.
- Os testes usam o jogo em **pt-BR** (os seletores procuram os textos da tela, como
  `'Terminar troca'`), viewport de 1600×900 e seeds fixas (`/game?seed=7`) para as partidas serem
  sempre iguais.

### Estrutura

| Pasta            | Conteúdo                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `e2e/specs/`     | os testes, um arquivo por área do app (`match-bot`, `deck-builder`, `multiplayer`…)                  |
| `e2e/fixtures/`  | o `test` do projeto: falha com erros de console, `openPlayer` e os page objects prontos              |
| `e2e/pages/`     | page objects: `MatchPage`, `LobbyPage`, `DeckBuilderPage`, `ReplayPage`, `HistoryPage`               |
| `e2e/helpers/`   | utilitários sem estado: storage inicial, servidor simulado, arquivos, controle, axe, erros da página |
| `e2e/constants/` | seeds, chaves do storage, tempos e tags                                                              |

- Importe sempre `test` e `expect` de `e2e/fixtures/test.ts`, nunca direto do `@playwright/test`.
- **Erros de console:** todo teste falha se a página lançar uma exceção ou registrar um erro no
  console. Um teste que espera um erro (ex.: servidor simulado com falha) declara o padrão com
  `test.use({ allowedConsoleErrors: /…/ })`.
- **Vários jogadores:** `openPlayer('Geralt')` abre outro navegador no lobby online e o fecha no fim
  do teste. O nome ganha um sufixo único (`player.name`), porque as salas de outros testes dividem o
  mesmo servidor.
- `MatchPage.playWholeMatch()` joga uma partida inteira pela interface (troca, escolhas, jogadas e
  passes). É usado pelos testes de partida, replay, histórico e multiplayer.
- Um controle de videogame é simulado substituindo `navigator.getGamepads` (`e2e/helpers/gamepad.ts`).
- **Sem esperas fixas:** nada de `waitForTimeout`. Espere um estado da tela (`expect`,
  `expect.poll`) ou controle o relógio com `page.clock` (ex.: segurar P por 1 segundo).
- **Servidor simulado:** `mockServerDown` e `mockServerError` (`e2e/helpers/server-mock.ts`)
  interceptam só os caminhos `/api/` (os módulos do Vite em `/src/.../api/` continuam carregando),
  então esses testes rodam com ou sem o servidor de verdade.
- **Arquivos:** downloads com `page.waitForEvent('download')` e uploads com `setInputFiles`
  (`jsonFile` monta um arquivo em memória).

### Quando um e2e falha

1. A saída mostra o passo que falhou e onde está o **trace** (`test-results/.../trace.zip`):
   `pnpm exec playwright show-trace <arquivo>` mostra cada passo com screenshot, DOM e console.
2. `pnpm e2e:report` abre o relatório HTML (com o screenshot do momento da falha).
3. Testes com várias páginas (multiplayer) só gravam o trace da página principal; quando uma
   partida não termina no prazo, o erro traz a árvore de acessibilidade da página que travou.
4. A máquina muito carregada deixa tudo mais lento: rode só o teste com problema, ou com menos
   workers (`pnpm e2e --workers=2`). No CI, um teste que falha roda mais uma vez.

## Convenções de nomes

Todo o código e os testes ficam em inglês (os textos da interface procurados nos testes continuam
em pt-BR, porque são o que aparece na tela).

- **Unitários:** `describe('<unidade testada>')` + `it('<faz algo> when <condição>')`, no presente,
  descrevendo o comportamento, não a implementação:
  `it('passes when the opponent has passed and the bot is winning')`.
- **e2e:** `test.describe('<área do app>')` + `test('<comportamento>')`, no presente e do ponto de
  vista do usuário, sem "player can" nem "should". Tags no objeto de detalhes, nunca no título, e
  `test.step` para as fases das jornadas longas:

  ```ts
  test.describe('Deck builder', () => {
    test('keeps the edited deck and faction after a reload', …);
  });
  test.describe('Multiplayer', { tag: '@server' }, () => {
    test('lets a spectator watch a live match without seeing any hand', …);
  });
  ```

  Tags: `@server` (precisa da API e do banco) e `@slow` (joga partidas inteiras).

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
