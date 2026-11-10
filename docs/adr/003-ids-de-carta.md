# ADR 003: Id das cartas = posição no catálogo

**Status:** aceito

## Contexto

As cartas precisam de um id estável, porque os arquivos de baralho
(`{"leader": 24, "cards": [[5, 1], ...]}`), os baralhos prontos e os replays guardam só esse número.

## Decisão

- `CardDefId` = posição da carta no `packages/engine/src/data/cards.json`; o catálogo valida isso
  ao carregar.
- Cartas novas entram **no fim** do array, para não mudar ids existentes.
- Cada cópia em jogo recebe um `CardInstanceId` próprio (`c0`, `c1`…), guardado no `GameState`.

## Consequências

- Arquivos de baralho continuam válidos entre versões, desde que nenhuma carta mude de posição.
- `count: 0` marca cartas que só entram em jogo por efeito (fichas e transformações).
