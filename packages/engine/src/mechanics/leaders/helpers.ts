import type { CardInstanceId, PlayerId } from '../../model/ids';
import { defOf } from '../../core/zones';
import { playWeather } from '../abilities/weather';
import type { EngineContext } from '../types';

/** Plays the last card with this name from the deck (searching from the end of the deck). */
export function playWeatherFromDeck(ctx: EngineContext, owner: PlayerId, name: string): void {
  const deck = ctx.state.players[owner].deck;
  const card = [...deck].reverse().find((id) => defOf(ctx.state, id).name === name);
  if (card) playWeather(ctx, card);
}

/** Asks the leader's owner to choose cards (if there are options). `data.owner` reaches the continuation. */
export function chooseCards(
  ctx: EngineContext,
  params: {
    owner: PlayerId;
    ability: string;
    kind: string;
    step: string;
    cards: CardInstanceId[];
    count: number;
    leader: CardInstanceId;
  },
): void {
  if (params.cards.length === 0) return;
  ctx.requestChoice({
    player: params.owner,
    kind: params.kind,
    sourceCardId: params.leader,
    options: params.cards.map((id) => ({ id, cardId: id })),
    min: params.count,
    max: params.count,
    resume: {
      ref: { kind: 'ability', id: params.ability },
      name: params.step,
      data: { owner: params.owner },
    },
  });
}
