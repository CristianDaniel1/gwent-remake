# Roadmap

Features planejadas, em ordem de prioridade sugerida. Cada uma tem objetivo, abordagem, o que muda em
cada parte do monorepo, decisões em aberto e como testar. Ao começar uma, siga o
[checklist de feature](#checklist-para-qualquer-feature) no fim deste arquivo.

Esforço: **P** (até 1 dia), **M** (alguns dias), **G** (uma semana ou mais).

| #   | Feature                                                                           | Esforço | Depende de   |
| --- | --------------------------------------------------------------------------------- | ------- | ------------ |
| 1   | [Contas de usuário e partida ranqueada](#1-contas-de-usuário-e-partida-ranqueada) | G       | —            |
| 2   | [Mutadores no online](#2-mutadores-no-online)                                     | P       | —            |
| 3   | [Estatísticas e conquistas](#3-estatísticas-e-conquistas)                         | M       | 1 (opcional) |
| 4   | [Quebra-cabeças](#4-quebra-cabeças)                                               | M       | —            |
| 5   | [Desafio diário](#5-desafio-diário)                                               | P       | 4 (opcional) |
| 6   | [Bot mais forte (ISMCTS)](#6-bot-mais-forte-ismcts)                               | M       | —            |
| 7   | [Campanha (taverna)](#7-campanha-taverna)                                         | G       | 3            |
| 8   | [Código de baralho](#8-código-de-baralho)                                         | P       | —            |
| 9   | [Emotes no multiplayer](#9-emotes-no-multiplayer)                                 | P       | —            |
| 10  | [Torneio entre amigos](#10-torneio-entre-amigos)                                  | G       | 1            |
| 11  | [Tutorial interativo](#11-tutorial-interativo)                                    | M       | 4            |
| 12  | [Celular e PWA](#12-celular-e-pwa)                                                | M       | —            |

---

## 1. Contas de usuário e partida ranqueada

**Objetivo:** jogadores com conta (login de verdade), pontuação de habilidade (rating) e uma fila
ranqueada que pareia jogadores de força parecida. Hoje existe só um **perfil sem login** (um nome; o
id fica no navegador), o que permite qualquer um usar o perfil de outro.

### Decisão principal: método de login

| Opção                                         | Prós                                        | Contras                                                                   |
| --------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| **E-mail + senha** (recomendado para começar) | sem serviço externo, funciona offline/local | guardar senha com segurança, fluxo de "esqueci a senha" precisa de e-mail |
| Link mágico por e-mail                        | sem senha                                   | precisa de um serviço de e-mail (SMTP) mesmo localmente                   |
| OAuth (GitHub/Google/Discord)                 | sem senha, rápido para o usuário            | precisa registrar o app em cada provedor e de URL pública para o callback |

Recomendação: **e-mail (ou nome de usuário) + senha**, com sessão em **cookie httpOnly** (não usar
JWT no `localStorage`: um XSS roubaria o token). OAuth pode entrar depois como alternativa, ligado à
mesma conta.

### Rating

- **Glicko-2** (recomendado) ou Elo. O Glicko-2 tem também a _incerteza_ do rating: jogadores novos
  sobem/descem rápido e estabilizam com o tempo; com poucos jogadores (uso entre amigos), é bem
  melhor que o Elo puro. Pode ser implementado em ~100 linhas puras no `packages/shared` ou num
  módulo do server, com testes contra valores do artigo de referência do Glicko-2.
- Rating começa em 1500 (desvio 350). Só a **fila ranqueada** altera o rating; salas por código e
  partidas contra o bot não contam.
- Mostrar faixas (ex.: Bronze/Prata/Ouro/Diamante) só como apresentação do número.

### Servidor (`apps/server`)

1. **Prisma:** novo modelo `User` (`id`, `username` único, `email` único opcional, `passwordHash`,
   `rating`, `ratingDeviation`, `volatility`, `createdAt`) e `Session` (`id`, `userId`, `expiresAt`).
   Migrar `Profile` → `User`: a forma mais simples é **ligar o perfil a um usuário** (`Profile.userId`
   opcional) e permitir "reivindicar" o perfil atual ao criar a conta, mantendo histórico e decks.
2. **Módulo `auth`:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
   Senhas com **argon2id** (`@node-rs/argon2`), rate limit por IP no login (o `@nestjs/throttler`
   resolve), mensagens de erro genéricas ("usuário ou senha inválidos").
3. **Guard** `AuthGuard` que lê o cookie de sessão; as rotas de perfil/decks/partidas passam a exigir
   o dono (hoje qualquer um com o id acessa).
4. **Socket.IO:** autenticar na conexão (o cookie vai no handshake do websocket; validar a sessão em
   `handleConnection`). O nome do jogador vem da conta, não do formulário.
5. **Fila ranqueada:** `queue:join` ganha `{ ranked: true }`. O `RoomsService` pareia quem está na
   fila pela menor diferença de rating, aumentando a tolerância com o tempo de espera (ex.: ±100,
   +50 a cada 10 s). Exigir conta para a fila ranqueada.
6. **Ao fim da partida ranqueada:** o `MatchRecorder` já reproduz e grava a partida; ele passa a
   calcular o novo rating dos dois numa **transação** e gravar o antes/depois na partida
   (`ratingBefore`, `ratingAfter`) para o histórico.
7. **Abandono:** sair ou cair sem voltar no prazo conta como derrota na ranqueada (já existe o
   fechamento por `opponentLeft`/`opponentTimedOut`).

### Front (`apps/web`)

- Feature `features/auth`: telas de entrar/criar conta, store da sessão (TanStack Query em
  `/auth/me`), botão de sair no menu.
- Lobby: botão **Partida ranqueada** (só logado) mostrando o rating e a faixa; durante a busca, a
  tolerância atual.
- Histórico: coluna de variação do rating (+12 / −9) nas ranqueadas.
- Página de **ranking** (top 50 e a posição do jogador).

### Engine e shared

- O engine não muda. O `shared` ganha os schemas de auth (`RegisterSchema`, `LoginSchema`,
  `UserSchema`) e, se o Glicko-2 ficar lá, a função pura de rating (fácil de testar).

### Decisões em aberto

- Nome de usuário, e-mail ou os dois? (Sem servidor de e-mail, recuperar senha fica manual.)
- Deixar jogar online sem conta (salas por código) ou exigir conta para tudo?
- Temporadas (reset parcial do rating a cada N meses)?

### Testes

- Unitários: Glicko-2 contra os valores de referência; pareamento da fila com tempos falsos.
- API (Supertest): registro, login, sessão expirada, acesso negado a dados de outro usuário,
  rate limit do login.
- e2e: criar conta, entrar, duas contas na fila ranqueada, rating muda no fim, histórico mostra a
  variação.

---

## 2. Mutadores no online

**Objetivo:** salas com mutadores. Hoje eles só existem contra o computador.

- `EnterRoomSchema` ganha `mutators` (só quem cria a sala escolhe); a `RoomView` mostra os mutadores
  para quem entra (pelo código ou pela lista ao vivo), antes de a partida começar.
- `RoomsService.startGame` passa os mutadores ao `createGame` e ao `MatchRecorder` (o banco já tem a
  coluna).
- Fila rápida: sem mutadores (ou uma fila por combinação, se fizer sentido).
- Testes: unitário no `RoomsService`; e2e criando sala com mutador e conferindo os selos nos dois.

## 3. Estatísticas e conquistas

**Objetivo:** página de estatísticas (vitórias por facção, cartas mais jogadas, duração média) e
conquistas ("vença sem usar o líder", "ganhe uma rodada com 100+ pontos").

- As partidas salvas têm seed + ações: as estatísticas podem ser **calculadas reproduzindo** as
  partidas com o engine (no server, sob demanda e com cache), sem guardar contadores separados.
- Conquistas: funções puras `(estadoFinal, eventos, lado) => boolean` num registro (como as
  mecânicas), avaliadas pelo `MatchRecorder` ao gravar; tabela `Achievement(userId, id, unlockedAt)`.
- Sem servidor: dá para calcular as locais a partir dos replays guardados no navegador (se a
  feature guardar os últimos N replays localmente).

## 4. Quebra-cabeças

**Objetivo:** situações montadas ("vença esta rodada com as cartas da mão") com solução.

- O engine já aceita qualquer estado: um quebra-cabeça é um `ScenarioSpec` (o mesmo formato de
  `testing/scenario.ts`, que pode virar API pública) + objetivo + dica, em JSON validado por Zod.
- O "oponente" do quebra-cabeça usa o bot normal (ou ações fixas).
- Verificação automática: um teste roda o bot difícil em cada quebra-cabeça para garantir que tem
  solução.

## 5. Desafio diário

**Objetivo:** todo mundo joga a mesma partida no dia (mesma seed, mesmos baralhos, talvez mutadores).

- Seed = hash da data (UTC); baralhos sorteados da lista pronta com essa seed. Tudo determinístico,
  então funciona sem servidor.
- Com servidor: ranking do dia por placar/margem de vitória; o servidor confere reproduzindo a
  partida (o `MatchReplayer` já faz isso).

## 6. Bot mais forte (ISMCTS)

**Objetivo:** um nível acima do Difícil.

- Trocar a busca plana por **ISMCTS** (Information Set Monte Carlo Tree Search): uma árvore sobre o
  que o bot sabe, reaproveitando `determinize` e o worker que já existem.
- Política de simulação: o bot normal (como hoje). Medir contra o Difícil com o mesmo método do
  ADR 008 (partidas alternando lados).
- Opcional: tempo de pensamento configurável.

## 7. Campanha (taverna)

**Objetivo:** sequência de oponentes com baralhos e "personalidades" (pesos diferentes no bot),
desbloqueando cartas como no Witcher 3.

- Oponentes em JSON (baralho, dificuldade, mutadores, falas); progresso salvo no navegador (e na
  conta, se houver).
- "Personalidade" = multiplicadores nos pesos do bot normal (ex.: agressivo passa menos, gosta de
  espiões): exige expor esses pesos como parâmetros no `ai/turn.ts`.
- Cartas bloqueadas: o montador passa a filtrar pela coleção do jogador.

## 8. Código de baralho

**Objetivo:** compartilhar um baralho como um código curto (ex.: `NR-24-...`).

- Codificar `DeckList` em bytes (facção, líder, pares id/quantidade) + base64url; decodificar com
  validação pelo `DeckSchema`. Função pura no `shared`, com teste de ida e volta.
- Botões "Copiar código" e "Colar código" no montador.

## 9. Emotes no multiplayer

**Objetivo:** reações rápidas ("Boa jogada!", "Hmm…", "Obrigado") sem chat livre.

- Evento `room:emote` com um id de uma lista fixa (sem texto livre = sem moderação); rate limit já
  existe. Balão sobre o painel do jogador por 2 s; opção de silenciar o oponente.

## 10. Torneio entre amigos

**Objetivo:** chaveamento (eliminatória) com várias salas.

- Modelo `Tournament` + `TournamentMatch`; o anfitrião cria e compartilha um código; as partidas da
  rodada viram salas normais; o vencedor avança automaticamente (o `MatchRecorder` avisa).
- Depende de contas (feature 1) para saber quem é quem entre as partidas.

## 11. Tutorial interativo

**Objetivo:** ensinar as regras jogando.

- Uma sequência de quebra-cabeças (feature 4) com textos e destaques na interface ("clique nesta
  carta", "agora na fileira de cerco"). Os passos podem esperar ações específicas do engine.

## 12. Celular e PWA

**Objetivo:** jogar no celular deitado e instalar como app.

- O palco 16:9 já escala; revisar toques (toque longo = detalhes já funciona), tamanhos mínimos de
  toque e a dica de girar a tela.
- PWA: `vite-plugin-pwa` com cache dos assets (cerca de 36 MB: cachear sob demanda, não tudo na
  instalação).

---

## Checklist para qualquer feature

1. **Decidir e registrar:** se a feature tiver uma decisão de arquitetura, escreva um ADR em
   `docs/adr/NNN-titulo.md` (contexto, decisões, consequências).
2. **Engine primeiro:** regras novas entram no `packages/engine` como funções puras, pelo registro
   de mecânicas quando possível (`docs/mecanicas.md`), com testes usando `scenario()`.
3. **Contratos:** dados que cruzam front/servidor ganham schema Zod no `packages/shared`.
4. **Servidor:** controller fino → service → repository; migração Prisma com nome descritivo
   (`pnpm --filter @gwent/server db:migrate`); o servidor nunca confia no cliente (reproduz partidas).
5. **Front:** uma pasta em `apps/web/src/features/<feature>` com `index.ts` exportando só o que outras
   features usam; textos nos **três idiomas** (`common.json` de pt-BR, en e es).
6. **Acessibilidade:** controles com nome acessível, funcionando por teclado e pelo controle.
7. **Testes:** unitários para regras e lógica; componente para telas; e2e para o fluxo principal.
   Nomes em inglês descrevendo o comportamento (`docs/testes.md`).
8. **Documentação:** README (como usar), este roadmap (marcar como feito ou atualizar) e o guia de
   mecânicas, se for o caso.
9. **Verificar:** `pnpm verify:all` antes de abrir o PR.
