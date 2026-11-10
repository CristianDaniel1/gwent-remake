# ADR 009: Mutadores (regras extras da partida)

**Status:** aceito

## Contexto

O registro de mecânicas foi feito para crescer sem mexer no núcleo do engine, mas só tinha sido
usado pelas habilidades das cartas. Os mutadores são o primeiro teste disso: regras que valem para
a partida inteira, escolhidas antes de começar.

## Decisões

- **Um tipo novo no registro**, `MutatorDefinition`, ao lado de habilidades e facções: `setup`
  (estado inicial), `hooks` (`gameStart`, `roundStart`, `roundEnd`, `turnEnd`), `tasks` e `choices`.
  Os hooks rodam uma vez por jogador, pela mesma pilha de tarefas das facções e líderes.
- **Quatro mutadores, cada um num ponto de extensão:** Mãos cheias (hook de início), Sem líderes
  (`setup`), Inspiração (hook de fim de turno + bônus permanente por carta) e Clima persistente
  (hook de fim de rodada + marca `noRemove` no clima).
- **Mudanças pequenas no núcleo**, todas genéricas: o hook `turnEnd` passou a ser disparado (já
  existia no tipo), a carta ganhou `boost` (somado antes de qualquer efeito; o clima continua
  deixando a força em 1, e o bônus some quando a carta sai da fileira) e o fim de rodada respeita
  `noRemove` também no clima.
- **Fazem parte da partida reproduzível:** `createGame({ mutators })` guarda os ids em
  `state.mutators`; o arquivo de replay, a API e o banco (coluna `mutators`) também. O servidor
  recusa mutadores desconhecidos (422).
- **Só contra o computador, por enquanto.** São escolhidos em "Opções da partida" no montador e
  aparecem como selos no topo do tabuleiro e no histórico.

## Consequências

- Mecânicas novas que mudam a partida inteira não precisam tocar no núcleo.
- Partidas online ainda não têm mutadores (precisaria de acordo entre os dois jogadores na sala).
