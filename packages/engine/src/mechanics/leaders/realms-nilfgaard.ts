// Northern Realms (Foltest) and Nilfgaard (Emhyr) leaders.
import { moveCard } from '../../core/board';
import { instanceOf } from '../../core/zones';
import { opponentOf, type CardInstanceId, type PlayerId } from '../../model/ids';
import { leaderHorn } from '../abilities/row-effects';
import { rowScorch } from '../abilities/removal';
import { graveUnits } from '../abilities/unit-effects';
import { clearWeather } from '../abilities/weather';
import type { AbilityDefinition, EngineContext } from '../types';
import { chooseCards, playWeatherFromDeck } from './helpers';

const leaderOf = (ctx: EngineContext, owner: PlayerId) => ctx.state.players[owner].leader;

export const foltestLeaders: AbilityDefinition[] = [
  {
    id: 'foltest_king',
    onActivate: (ctx, owner) => playWeatherFromDeck(ctx, owner, 'Impenetrable Fog'),
  },
  {
    id: 'foltest_lord',
    onActivate: (ctx) => clearWeather(ctx),
  },
  {
    id: 'foltest_siegemaster',
    onActivate: (ctx, owner) => leaderHorn(ctx, owner, 'siege'),
  },
  {
    id: 'foltest_steelforged',
    onActivate: (ctx, owner) => rowScorch(ctx, leaderOf(ctx, owner), opponentOf(owner), 'siege'),
  },
  {
    id: 'foltest_son',
    onActivate: (ctx, owner) => rowScorch(ctx, leaderOf(ctx, owner), opponentOf(owner), 'ranged'),
  },
];

export const emhyrLeaders: AbilityDefinition[] = [
  {
    id: 'emhyr_imperial',
    onActivate: (ctx, owner) => playWeatherFromDeck(ctx, owner, 'Torrential Rain'),
  },
  {
    // Reveals 3 random cards from the opponent's hand (only to the activating player).
    id: 'emhyr_emperor',
    onActivate: (ctx, owner) => {
      const hand = [...ctx.state.players[opponentOf(owner)].hand];
      const rng = ctx.random('game');
      const revealed: CardInstanceId[] = [];
      while (revealed.length < 3 && hand.length > 0) {
        revealed.push(hand.splice(rng.int(hand.length), 1)[0] as CardInstanceId);
      }
      ctx.emit({ type: 'CARDS_REVEALED', player: owner, cardIds: revealed });
    },
  },
  // White Flame: cancels both players' leaders (applied when the match is created).
  { id: 'emhyr_whiteflame' },
  {
    // Takes a unit from the opponent's grave into its own hand.
    id: 'emhyr_relentless',
    onActivate: (ctx, owner) =>
      chooseCards(ctx, {
        owner,
        ability: 'emhyr_relentless',
        kind: 'stealFromGrave',
        step: 'steal',
        cards: graveUnits(ctx.state, opponentOf(owner)),
        count: 1,
        leader: leaderOf(ctx, owner),
      }),
    choices: {
      steal: (ctx, [id], data) => {
        if (!id) return;
        const cardId = id as CardInstanceId;
        const owner = data.owner as PlayerId;
        moveCard(ctx, cardId, { kind: 'hand', player: owner }, 'steal');
        instanceOf(ctx.state, cardId).owner = owner;
      },
    },
  },
  {
    id: 'emhyr_invader',
    hooks: { gameStart: (ctx) => void (ctx.state.flags.randomRespawn = true) },
  },
];
