// Monsters (Eredin), Scoia'tael (Francesca) and Skellige (Crach, Bran) leaders.
import { drawCards, moveCard, sendToGrave, shuffleIntoDeck } from '../../core/board';
import { computeBoard } from '../../core/scoring';
import { defOf } from '../../core/zones';
import { opponentOf, type CardInstanceId, type PlayerId } from '../../model/ids';
import type { GameState } from '../../model/state';
import { leaderHorn } from '../abilities/row-effects';
import { rowScorch } from '../abilities/removal';
import { graveUnits } from '../abilities/unit-effects';
import { playWeather } from '../abilities/weather';
import type { AbilityDefinition, EngineContext } from '../types';
import { chooseCards, playWeatherFromDeck } from './helpers';

const leaderOf = (ctx: EngineContext, owner: PlayerId) => ctx.state.players[owner].leader;

export const eredinLeaders: AbilityDefinition[] = [
  {
    id: 'eredin_commander',
    onActivate: (ctx, owner) => leaderHorn(ctx, owner, 'close'),
  },
  {
    // Returns a unit from its own grave to the hand.
    id: 'eredin_bringer_of_death',
    onActivate: (ctx, owner) =>
      chooseCards(ctx, {
        owner,
        ability: 'eredin_bringer_of_death',
        kind: 'returnFromGrave',
        step: 'return',
        cards: graveUnits(ctx.state, owner),
        count: 1,
        leader: leaderOf(ctx, owner),
      }),
    choices: {
      return: (ctx, [id], data) => {
        if (id)
          moveCard(
            ctx,
            id as CardInstanceId,
            { kind: 'hand', player: data.owner as PlayerId },
            'return',
          );
      },
    },
  },
  {
    // Discards 2 cards and picks 1 from the deck.
    id: 'eredin_destroyer',
    canActivate: (state, owner) => state.players[owner].hand.length >= 2,
    onActivate: (ctx, owner) =>
      chooseCards(ctx, {
        owner,
        ability: 'eredin_destroyer',
        kind: 'discard',
        step: 'discard',
        cards: [...ctx.state.players[owner].hand],
        count: 2,
        leader: leaderOf(ctx, owner),
      }),
    choices: {
      discard: (ctx, ids, data) => {
        const owner = data.owner as PlayerId;
        for (const id of ids) sendToGrave(ctx, id as CardInstanceId, 'discard');
        chooseCards(ctx, {
          owner,
          ability: 'eredin_destroyer',
          kind: 'drawFromDeck',
          step: 'draw',
          cards: [...ctx.state.players[owner].deck],
          count: 1,
          leader: leaderOf(ctx, owner),
        });
      },
      draw: (ctx, [id], data) => {
        if (id)
          moveCard(
            ctx,
            id as CardInstanceId,
            { kind: 'hand', player: data.owner as PlayerId },
            'draw',
          );
      },
    },
  },
  {
    // Picks any weather card from the deck and plays it.
    id: 'eredin_king',
    onActivate: (ctx, owner) =>
      chooseCards(ctx, {
        owner,
        ability: 'eredin_king',
        kind: 'weatherFromDeck',
        step: 'play',
        cards: ctx.state.players[owner].deck.filter(
          (id) => defOf(ctx.state, id).type === 'weather',
        ),
        count: 1,
        leader: leaderOf(ctx, owner),
      }),
    choices: {
      play: (ctx, [id]) => {
        if (id) playWeather(ctx, id as CardInstanceId);
      },
    },
  },
  {
    id: 'eredin_treacherous',
    hooks: { gameStart: (ctx) => void (ctx.state.flags.doubleSpyPower = true) },
  },
];

/** Player's agile units: best split between close and ranged. */
export function bestAgileRows(state: GameState, owner: PlayerId) {
  const rows = state.players[owner].rows;
  const agile = (['close', 'ranged'] as const).flatMap((row) =>
    rows[row].units.filter((id) => defOf(state, id).row === 'agile').map((id) => ({ id, row })),
  );
  if (agile.length === 0) return { gain: 0, moves: [] as typeof agile };

  const ids = new Set(agile.map((a) => a.id));
  const base = {
    close: rows.close.units.filter((id) => !ids.has(id)),
    ranged: rows.ranged.units.filter((id) => !ids.has(id)),
  };
  const scoreWith = (close: CardInstanceId[], ranged: CardInstanceId[]) => {
    const trial: GameState = {
      ...state,
      players: {
        ...state.players,
        [owner]: {
          ...state.players[owner],
          rows: {
            ...rows,
            close: { ...rows.close, units: close },
            ranged: { ...rows.ranged, units: ranged },
          },
        },
      },
    };
    const side = computeBoard(trial)[owner];
    return side.rows.close.total + side.rows.ranged.total;
  };

  // Tries every combination; on a tie the first one wins (more cards in close).
  let best = { score: -Infinity, pattern: 0 };
  const n = agile.length;
  for (let pattern = 0; pattern < 1 << n; pattern++) {
    const close = [...base.close];
    const ranged = [...base.ranged];
    agile.forEach((a, i) => ((pattern >> (n - 1 - i)) & 1 ? ranged : close).push(a.id));
    const score = scoreWith(close, ranged);
    if (score > best.score) best = { score, pattern };
  }
  const current = scoreWith(rows.close.units, rows.ranged.units);
  const moves = agile
    .map((a, i) => ({
      id: a.id,
      row: (best.pattern >> (n - 1 - i)) & 1 ? ('ranged' as const) : ('close' as const),
    }))
    .filter((m, i) => m.row !== agile[i]?.row);
  return { gain: best.score - current, moves };
}

export const francescaLeaders: AbilityDefinition[] = [
  {
    id: 'francesca_queen',
    onActivate: (ctx, owner) => rowScorch(ctx, leaderOf(ctx, owner), opponentOf(owner), 'close'),
  },
  {
    id: 'francesca_beautiful',
    onActivate: (ctx, owner) => leaderHorn(ctx, owner, 'ranged'),
  },
  {
    // Draws an extra card at the start (before the hands are dealt: starts with 11).
    id: 'francesca_daisy',
    hooks: { gameStart: (ctx, owner) => void drawCards(ctx, owner, 1) },
  },
  {
    id: 'francesca_pureblood',
    onActivate: (ctx, owner) => playWeatherFromDeck(ctx, owner, 'Biting Frost'),
  },
  {
    // Moves agile units to the row where they score most.
    id: 'francesca_hope',
    onActivate: (ctx, owner) => {
      for (const { id, row } of bestAgileRows(ctx.state, owner).moves) {
        moveCard(ctx, id, { kind: 'row', side: owner, row }, 'move', { triggerLeave: false });
      }
    },
  },
];

export const skelligeLeaders: AbilityDefinition[] = [
  {
    // Shuffles the graves back into the decks (both players).
    id: 'crach_an_craite',
    onActivate: (ctx, owner) => {
      for (const player of [owner, opponentOf(owner)]) {
        for (const id of [...ctx.state.players[player].grave]) shuffleIntoDeck(ctx, id, player);
      }
    },
  },
  {
    // Weather only halves the strength of this player's units.
    id: 'king_bran',
    hooks: { gameStart: (ctx, owner) => void (ctx.state.players[owner].halfWeather = true) },
  },
];
