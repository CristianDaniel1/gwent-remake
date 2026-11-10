# ADR 006: Multiplayer com servidor autoritativo (Socket.IO)

**Status:** aceito

## Contexto

A alternativa mais simples seria _lockstep_: um relay repassa as jogadas e cada navegador roda a
partida inteira (com o baralho do oponente e a seed). Isso expõe a informação oculta a quem abrir
as ferramentas do navegador e exige detectar dessincronização.

## Decisões

- **O servidor é a autoridade**: guarda o estado completo e roda o mesmo engine. O cliente só
  envia a ação que quer fazer (`game:action`); o servidor valida com `applyAction` e manda o novo
  estado. Ação ilegal é recusada, sem afetar a partida.
- **Cada jogador recebe só o que pode ver** (`projectFor` / `projectEvents` no engine): sem a mão
  do oponente, sem o conteúdo e a ordem dos baralhos, sem as opções de escolha do oponente e
  **sem a seed e o estado do gerador aleatório** (com eles, um cliente preveria todas as compras).
  Um teste garante, em centenas de estados reais, que com a projeção o jogador calcula exatamente
  as mesmas jogadas legais e o mesmo placar que com o estado completo.
- **Salas em memória** (`RoomsService`), com código de 5 letras (sem
  0/O/1/I/L, fáceis de confundir) e partida rápida (fila). A lógica não conhece sockets: avisa os jogadores pela
  interface `RoomNotifier`, implementada pelo gateway. Assim ela é testada sem rede, com timers falsos.
- **Gateway fino**: limite de 25 mensagens/s com rajada de 50 por conexão,
  validação Zod de cada mensagem (contratos em `@gwent/shared/socket`) e repasse ao serviço.
- **Reconexão**: ao entrar, o jogador recebe um token (guardado no `sessionStorage`, por aba).
  Se a conexão cair, a vaga espera 60 s; o Socket.IO reconecta sozinho e o cliente retoma a vaga.
  Recarregar a página também retoma.
- **Tempo por turno**: 90 s; depois disso o servidor faz a jogada automática (encerra a troca,
  responde a escolha com a primeira opção ou passa a rodada).
- **Espectadores**: qualquer um pode assistir uma sala (pela lista de partidas ao vivo ou pelo
  código). O espectador recebe `projectFor(state, null)`: tabuleiro, clima e cemitérios, mas
  **nenhuma mão** (nem as opções de escolha), para não poder repassar informação a um jogador.
  Os jogadores veem quantas pessoas estão assistindo; sair como espectador não afeta a sala.
- **Front**: a partida online tem página própria na feature `online`, que reaproveita o `Board`
  da feature `game`. O store do jogo tem dois modos (`local` e `online`); no online, `dispatch`
  envia ao servidor e o estado vem só do servidor.

## Consequências

- Não há como trapacear vendo cartas escondidas: elas nunca saem do servidor.
- As salas somem se o servidor reiniciar (aceitável para uso local).
- Partidas online entram no histórico de quem tem perfil (ver ADR 007).
