# Documentação

| Documento                    | Para quê                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------- |
| [roadmap.md](roadmap.md)     | próximas features, com o desenho de cada uma e o checklist para implementar   |
| [testes.md](testes.md)       | como rodar e escrever testes unitários e e2e, depurar falhas e o que o CI faz |
| [mecanicas.md](mecanicas.md) | como adicionar habilidades, cartas, líderes, facções e mutadores ao engine    |
| [adr/](adr/)                 | decisões de arquitetura (o porquê de cada escolha)                            |

## Decisões de arquitetura (ADRs)

| ADR                                  | Assunto                                              |
| ------------------------------------ | ---------------------------------------------------- |
| [001](adr/001-engine-puro.md)        | Engine de regras puro e separado da UI               |
| [002](adr/002-monorepo-pnpm.md)      | Monorepo com pnpm workspaces e internal packages     |
| [003](adr/003-ids-de-carta.md)       | Id das cartas = posição no catálogo                  |
| [004](adr/004-pilha-de-resolucao.md) | Pilha de resolução e escolhas pendentes              |
| [005](adr/005-backend.md)            | Backend (NestJS + Prisma + PostgreSQL no Docker)     |
| [006](adr/006-multiplayer.md)        | Multiplayer com servidor autoritativo e espectadores |
| [007](adr/007-replays.md)            | Replays a partir de seed + ações                     |
| [008](adr/008-dificuldade-do-bot.md) | Níveis de dificuldade do bot                         |
| [009](adr/009-mutadores.md)          | Mutadores (regras extras da partida)                 |

Para uma decisão nova, copie a estrutura de um ADR existente (Status, Contexto, Decisões,
Consequências) com o próximo número.
