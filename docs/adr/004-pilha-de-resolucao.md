# ADR 004: Pilha de resolução e escolhas pendentes

**Status:** aceito

## Contexto

Vários efeitos pedem uma decisão no meio da resolução (Médico escolhe a carta, unidade agile
escolhe a fileira, Scoia'tael escolhe quem começa, líderes que pegam cartas) e efeitos disparam
outros em cadeia (Médico → Espião → compra; Queimar → Avenger → ficha). Um engine puro e
serializável não pode "esperar" a UI.

## Decisão

- O `GameState` guarda uma **pilha de tarefas** (`stack`) e no máximo uma **escolha pendente**
  (`pendingChoice`), ambas em JSON puro.
- Cada ação roda as tarefas até a pilha esvaziar ou até uma mecânica chamar `ctx.requestChoice(...)`.
  A partida então espera um `CHOOSE` do jogador indicado; a continuação é encontrada pelo
  `resume.ref` + `resume.name` no registro de mecânicas.
- Tarefas agendadas num mesmo passo rodam na ordem em que foram agendadas, antes do que já estava
  na pilha. Por isso uma jogada agenda o efeito e **depois** o `END_TURN`.
- Hooks (início/fim de rodada, início de partida) viram uma tarefa por facção/líder, para que uma
  escolha num deles pause antes do próximo.
- Toda movimentação de carta emite `CARD_MOVED { from, to, reason }`. A UI anima a partir disso.
- O dono da carta (`owner`) muda quando ela troca de lado (espião, Isca, Emhyr, o Implacável).

## Consequências

- O mesmo código serve para humano, bot e servidor: todos respondem escolhas com `CHOOSE`.
- O estado continua salvável a qualquer momento, inclusive no meio de uma escolha (multiplayer/replay).
- `getLegalActions` lista as respostas possíveis de uma escolha, então o bot não precisa de código especial.

## Decisões de regras

- Muster puxa as cópias só do **baralho**, como diz o texto da carta no jogo ("…no seu baralho…") e a
  wiki da Fextralife (as cópias na mão ficam na mão).
- Médico/agile: o jogador humano não pode cancelar a escolha (fechar sem escolher desperdiçaria o efeito).
- Skellige (3ª rodada) sorteia as unidades com o fluxo aleatório da partida, para humano e bot.
- Emhyr, o Imperador sorteia as cartas reveladas com o fluxo da partida (nunca `Math.random`), para
  o replay reproduzir tudo.
