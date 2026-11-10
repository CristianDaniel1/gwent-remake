# Como adicionar uma mecânica

Tudo fica em `packages/engine/src/mechanics/`. O núcleo (`core/`) não precisa mudar.

## 1. Habilidade de carta

Crie o objeto (num arquivo de `mechanics/abilities/` ou num novo) e coloque-o na lista em
`mechanics/registry.ts`.

```ts
import { drawCards } from '../../core/board';
import { instanceOf } from '../../core/zones';
import { announce } from '../helpers';
import type { AbilityDefinition } from '../types';

// Exemplo: "ao entrar em campo, o dono compra 1 carta"
export const scout: AbilityDefinition = {
  id: 'scout',
  onPlace: (ctx, position) => {
    announce(ctx, 'scout', position); // a UI toca som/animação
    drawCards(ctx, instanceOf(ctx.state, position.cardId).owner, 1);
  },
};
```

Ganchos disponíveis em `AbilityDefinition` (veja `mechanics/types.ts`):

| Campo                        | Quando roda                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `modifiers`                  | sempre que a força é calculada (efeitos passivos: moral, corneta, clima…) |
| `onPlace` / `onLeave`        | ao entrar / sair de uma fileira                                           |
| `play`                       | como uma carta especial/de clima é jogada da mão (opções + resolução)     |
| `playsOnOpponentSide`        | a unidade cai do lado do oponente (espião)                                |
| `onActivate` / `canActivate` | habilidade de líder                                                       |
| `hooks`                      | início da partida, início/fim de rodada (efeitos passivos de líder)       |
| `tasks` / `choices`          | continuações de efeitos em várias etapas                                  |
| `aiWeight`                   | quanto o bot quer ativar este líder (sem isso, usa o peso padrão do bot)  |

## 2. Efeito que pede uma escolha

```ts
onPlace: (ctx, position) => {
  ctx.requestChoice({
    player: instanceOf(ctx.state, position.cardId).owner,
    kind: 'minhaEscolha',            // a UI usa para escolher o texto
    options: cartas.map((id) => ({ id, cardId: id })),
    min: 1,
    max: 1,
    resume: { ref: { kind: 'ability', id: 'minha_habilidade' }, name: 'depois', data: {} },
  });
},
choices: {
  depois: (ctx, [escolhida], data) => { /* continua aqui */ },
},
```

A resolução pausa até o jogador responder com `CHOOSE`. Os dados em `data` precisam ser
serializáveis (sem funções ou classes).

## 3. Carta nova

1. Adicione a carta no **fim** de `packages/engine/src/data/cards.json`, com `id` = posição na lista
   (as cartas existentes nunca mudam de posição: decks salvos dependem disso).
2. Adicione as imagens `img/sm/<facção>_<arquivo>.jpg` e `img/lg/...`.
3. Adicione os nomes em `apps/web/src/shared/i18n/locales/<idioma>/cards.json`.

O teste `mechanics/registry.test.ts` falha se uma carta usar uma habilidade sem definição.

## 4. Bot

O bot (`packages/engine/src/ai/`) calcula o peso de jogar cada carta simulando o placar com o próprio
engine, então efeitos de pontuação novos (`modifiers`) já entram na conta dele sem código extra.
Para efeitos ao entrar em campo, o peso padrão é a força da carta. Escolhas de tipo (`kind`) que ele
não conhece são respondidas com as primeiras opções: se a mecânica precisar de algo melhor,
adicione um caso em `ai/choices.ts`.

## 5. Teste

Use `scenario()` (`testing/scenario.ts`) para montar o tabuleiro e `act()` para jogar:

```ts
let state = scenario({ p1: { hand: [MINHA_CARTA, VES], deck: [BALLISTA] } });
state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, MINHA_CARTA) }).state;
expect(state.players.p1.hand).toHaveLength(2);
```

A simulação (`core/simulation.test.ts`) joga centenas de partidas aleatórias com os decks prontos
e confere que nenhuma carta some ou duplica: rode `pnpm test` depois de qualquer mecânica nova.

## 6. Mutadores (regras da partida)

Um mutador muda as regras da partida inteira, não de uma carta: fica em
`packages/engine/src/mechanics/mutators.ts` (ou é registrado com `registerMutator`) e pode usar:

- `setup(state)`: muda o estado inicial, antes de dar as cartas (ex.: **Sem líderes**);
- `hooks`: `gameStart`, `roundStart`, `roundEnd` e `turnEnd`, chamados uma vez para cada jogador
  (`owner`) — o `turnEnd` roda antes de a vez passar, então `state.currentPlayer` é quem acabou de
  jogar (ex.: **Inspiração**);
- `tasks`/`choices`, como as habilidades.

A partida guarda os ids em `state.mutators`; replays e histórico guardam a mesma lista, então a
partida é reproduzida com as mesmas regras. Para aparecer na interface, adicione `name` e
`description` em `mutators.<id>` nos arquivos `common.json` dos três idiomas (sem tradução, o id
aparece no lugar). Use `scenario({ mutators: ['meuMutador'] })` nos testes.
