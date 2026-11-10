# ADR 001: Engine de regras puro e separado da UI

**Status:** aceito

## Contexto

Quando as regras chamam a UI diretamente (`await ui.notification(...)`) e dependem de singletons
globais, não dá para testá-las, reaproveitá-las no servidor nem adicionar mecânicas com segurança.

## Decisão

- `@gwent/engine` é TypeScript puro (sem DOM, React ou Nest).
- O estado é um objeto serializável. `applyAction(state, action)` devolve `{ state, events }`.
- A UI anima a partir dos eventos. O servidor (futuro) roda o mesmo engine como autoridade.
- Mecânicas (habilidades, facções, líderes) entram por um registro, sem alterar o core.
- A aleatoriedade usa o RNG seedado com o estado dentro do `GameState` (replay = seed + ações).

## Consequências

- Regras testáveis isoladamente, incluindo simulações bot vs bot.
- Mais trabalho inicial: toda interação com o jogador vira ação, evento ou escolha pendente.
