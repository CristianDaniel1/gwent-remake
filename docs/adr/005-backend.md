# ADR 005: Backend (NestJS + Prisma + PostgreSQL no Docker)

**Status:** aceito

## Contexto

O jogo funciona inteiro no navegador. O servidor acrescenta perfis, decks salvos e histórico
de partidas, e é a base do multiplayer (Etapa 8). Não há deploy: tudo roda localmente.

## Decisões

- **PostgreSQL 17 no Docker** (`docker-compose.yml`), porta **5433** no host: a 5432 da máquina
  já é usada por um PostgreSQL instalado no Windows. Adminer em http://localhost:8080.
- **Prisma 7**: client gerado em `apps/server/src/generated/prisma` (fora do git), conexão pelo
  driver adapter `@prisma/adapter-pg`, configuração em `prisma.config.ts`.
- **Build com rspack** (builder do Nest CLI 12; o webpack foi marcado como obsoleto). O rspack
  compila com SWC, gerando a metadata de decorators que a injeção de dependência do Nest precisa,
  e **empacota `@gwent/engine` e `@gwent/shared`** (pacotes internos em TypeScript) dentro do
  servidor. As outras dependências ficam em `node_modules`.
- **Camadas**: controller fino (HTTP) → service (regras de aplicação) → repository (Prisma).
  DTOs gerados dos schemas Zod do `@gwent/shared` com `nestjs-zod`: o front e o servidor validam
  com o mesmo schema. Erros saem sempre no formato `ApiError` (`AllExceptionsFilter`).
- **Sem login**: o perfil é só um nome; o front guarda o id no navegador.
- **O servidor não confia no resultado enviado pelo cliente**: ele recebe seed, decks e ações,
  **reproduz a partida com o engine** e só salva se todas as ações forem legais e a partida tiver
  terminado. O resultado salvo é o calculado no servidor.
- **Partida em colunas JSON** (`rounds`, `decks`, `actions`) em vez de uma tabela de ações:
  as ações sempre são lidas e gravadas juntas, na ordem, para o replay.
- **Front**: TanStack Query para dados do servidor (o Zustand continua só com estado de
  interface); o jogo funciona sem servidor e os recursos online aparecem quando ele está no ar.

## Consequências

- Testes da API em duas camadas: unitários (módulos de teste do Nest com repositórios falsos) e
  e2e HTTP (supertest) num banco separado, `gwent_test`, criado e migrado automaticamente.
  Sem Docker, os e2e são pulados com aviso.
- No front, o MSW simula a API nos testes; o Playwright tem um teste do fluxo online completo,
  que roda quando o Postgres do Docker está no ar.
