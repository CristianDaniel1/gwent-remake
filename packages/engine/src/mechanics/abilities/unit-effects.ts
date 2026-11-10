// Unit abilities with enter/leave effects: Spy, Medic, Muster, Avenger.
import { drawCards, placeCard, placeNow, spawnCard } from '../../core/board';
import { defOf, instanceOf, isRegularUnit } from '../../core/zones';
import type { CardInstanceId, PlayerId } from '../../model/ids';
import type { GameState } from '../../model/state';
import { announce } from '../helpers';
import { POWER_STAGE, type AbilityDefinition, type EngineContext } from '../types';

/** Lands on the opponent's side (counts for them) and the owner draws 2 cards. */
export const spy: AbilityDefinition = {
  id: 'spy',
  playsOnOpponentSide: true,
  // Eredin, the Treacherous: spies with doubled strength.
  modifiers: (source, location, state) =>
    location === 'weather' || !state.flags.doubleSpyPower
      ? []
      : [
          {
            ...location,
            modifier: {
              stage: POWER_STAGE.spy,
              appliesTo: (target) => target.id === source.id,
              apply: (power) => power * 2,
            },
          },
        ],
  onPlace: (ctx, position) => {
    const card = instanceOf(ctx.state, position.cardId);
    announce(ctx, 'spy', position);
    drawCards(ctx, card.owner, 2);
    // From here on the card belongs to whoever received it (grave, Decoy, Medic).
    card.owner = position.side;
  },
};

export function graveUnits(state: GameState, player: PlayerId): CardInstanceId[] {
  return state.players[player].grave.filter((id) => isRegularUnit(defOf(state, id)));
}

/** Revives a unit from its own grave and plays it immediately. */
export const medic: AbilityDefinition = {
  id: 'medic',
  onPlace: (ctx, position) => {
    const { state } = ctx;
    const owner = instanceOf(state, position.cardId).owner;
    const units = graveUnits(state, owner);
    if (units.length === 0) return;
    announce(ctx, 'medic', position);

    // Emhyr, the Invader: the revived unit is random.
    if (state.flags.randomRespawn) {
      const pick = units[ctx.random('game').int(units.length)] as CardInstanceId;
      placeCard(ctx, pick, { reason: 'revive' });
      return;
    }
    ctx.requestChoice({
      player: owner,
      kind: 'medic',
      sourceCardId: position.cardId,
      options: units.map((id) => ({ id, cardId: id })),
      min: 1,
      max: 1,
      resume: { ref: { kind: 'ability', id: 'medic' }, name: 'revive', data: {} },
    });
  },
  choices: {
    revive: (ctx, [cardId]) => {
      if (cardId) placeCard(ctx, cardId as CardInstanceId, { reason: 'revive' });
    },
  },
};

/** Name used to find cards of the same group (prefix before the "-"). */
function musterGroup(name: string, override?: string): string {
  if (override) return override;
  const dash = name.indexOf('-');
  return dash === -1 ? name : name.substring(0, dash);
}

/** Summons to the board every card of the same group that is in the deck. */
export const muster: AbilityDefinition = {
  id: 'muster',
  onPlace: (ctx, position) => {
    const { state } = ctx;
    const def = defOf(state, position.cardId);
    const owner = instanceOf(state, position.cardId).owner;
    const group = musterGroup(def.name, def.muster);
    // Only from the deck, as the card text says.
    const called = state.players[owner].deck.filter(
      (id) => id !== position.cardId && defOf(state, id).name.startsWith(group),
    );
    if (called.length === 0) return;
    announce(ctx, 'muster', position);
    for (const id of called) placeCard(ctx, id, { reason: 'muster', suppress: ['muster'] });
  },
};

/** When leaving the board, summons a powerful token in its place (in the close row). */
function avenger(id: string, tokenDefId: number): AbilityDefinition {
  return {
    id,
    onLeave: (ctx: EngineContext, position) => {
      const token = spawnCard(ctx.state, tokenDefId, position.side, { token: true });
      ctx.emit({
        type: 'ABILITY_TRIGGERED',
        ability: 'avenger',
        player: position.side,
        cardId: token,
      });
      placeNow(ctx, token, position.side, 'close', { reason: 'summon' });
    },
  };
}

const BOVINE_DEFENSE_FORCE = 21;
const HEMDALL = 196;

export const unitEffectAbilities = [
  spy,
  medic,
  muster,
  avenger('avenger', BOVINE_DEFENSE_FORCE),
  avenger('avenger_kambi', HEMDALL),
];
