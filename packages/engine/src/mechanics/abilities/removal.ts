// Abilities that remove cards from the board: Scorch (global and per row), Decoy, Berserker/Mardroeme.
import { moveCard, placeNow, sendToGrave, spawnCard } from '../../core/board';
import { computeBoard } from '../../core/scoring';
import { defOf, instanceOf, isRegularUnit } from '../../core/zones';
import { COMBAT_ROWS, type CombatRow } from '../../model/card';
import { opponentOf, PLAYER_IDS, type CardInstanceId, type PlayerId } from '../../model/ids';
import type { GameState } from '../../model/state';
import { announce } from '../helpers';
import type { AbilityDefinition, EngineContext } from '../types';
import { specialSlotPlay } from './row-effects';

interface Candidate {
  id: CardInstanceId;
  power: number;
}

function strongest(candidates: Candidate[]): CardInstanceId[] {
  if (candidates.length === 0) return [];
  const max = Math.max(...candidates.map((c) => c.power));
  return candidates.filter((c) => c.power === max).map((c) => c.id);
}

function destroy(ctx: EngineContext, ids: CardInstanceId[], source: CardInstanceId) {
  if (ids.length === 0) return;
  announce(ctx, 'scorch', { cardId: source });
  for (const id of ids) sendToGrave(ctx, id, 'destroy');
}

/** Kills the strongest unit(s) on the whole board (heroes do not count). */
export function globalScorch(ctx: EngineContext, source: CardInstanceId, exclude?: CardInstanceId) {
  const { state } = ctx;
  const board = computeBoard(state);
  const candidates = PLAYER_IDS.flatMap((side) =>
    COMBAT_ROWS.flatMap((row) => board[side].rows[row].cards),
  ).filter((c) => c.id !== exclude && isRegularUnit(defOf(state, c.id)));
  destroy(ctx, strongest(candidates), source);
}

/** Kills the strongest unit(s) in the row when the row adds up to 10 or more. */
export function rowScorch(
  ctx: EngineContext,
  source: CardInstanceId,
  side: PlayerId,
  row: CombatRow,
) {
  const { state } = ctx;
  const score = computeBoard(state)[side].rows[row];
  if (score.total < 10) return;
  const candidates = score.cards.filter((c) => isRegularUnit(defOf(state, c.id)));
  destroy(ctx, strongest(candidates), source);
}

/** Scorch card (special) and units with global Scorch (Clan Dimun Pirate). */
export const scorch: AbilityDefinition = {
  id: 'scorch',
  play: {
    options: () => [{}],
    resolve: (ctx, _player, cardId) => {
      globalScorch(ctx, cardId);
      sendToGrave(ctx, cardId, 'discard');
    },
  },
  onPlace: (ctx, { cardId }) => globalScorch(ctx, cardId, cardId),
};

/** Scorch on the opponent's row when entering the board (Villentretenmerth, Toad, Schirru). */
function scorchRow(id: string, row: CombatRow): AbilityDefinition {
  return {
    id,
    onPlace: (ctx, { cardId }) => {
      const owner = instanceOf(ctx.state, cardId).owner;
      rowScorch(ctx, cardId, opponentOf(owner), row);
    },
  };
}

/** Swaps places with a unit on its own side, which returns to the hand. */
export const decoy: AbilityDefinition = {
  id: 'decoy',
  play: {
    options: (state, player) =>
      COMBAT_ROWS.flatMap((row) =>
        state.players[player].rows[row].units
          .filter((id) => isRegularUnit(defOf(state, id)))
          .map((targetId) => ({ row, targetId })),
      ),
    resolve: (ctx, player, cardId, { row, targetId }) => {
      if (!row || !targetId) throw new Error('Decoy without a target');
      announce(ctx, 'decoy', { cardId });
      moveCard(ctx, targetId, { kind: 'hand', player }, 'return');
      instanceOf(ctx.state, targetId).owner = player;
      placeNow(ctx, cardId, player, row, { reason: 'play' });
    },
  },
};

// --- Berserker / Mardroeme (Skellige) ---

const TRANSFORMED_VILDKAARL = 206;
const TRANSFORMED_YOUNG_VILDKAARL = 207;

function rowHasMardroeme(state: GameState, side: PlayerId, row: CombatRow): boolean {
  const { units, special } = state.players[side].rows[row];
  return [...units, ...(special ? [special] : [])].some((id) =>
    defOf(state, id).abilities.includes('mardroeme'),
  );
}

/** The berserker leaves the game and a bear (transformed Vildkaarl) takes its place. */
function transform(ctx: EngineContext, id: CardInstanceId, side: PlayerId, row: CombatRow) {
  const { state } = ctx;
  const young = defOf(state, id).name.includes('Young');
  const owner = instanceOf(state, id).owner;
  announce(ctx, 'berserker', { cardId: id });
  moveCard(ctx, id, { kind: 'void' }, 'transform');
  const bear = spawnCard(state, young ? TRANSFORMED_YOUNG_VILDKAARL : TRANSFORMED_VILDKAARL, owner);
  placeNow(ctx, bear, side, row, { reason: 'transform' });
}

export const berserker: AbilityDefinition = {
  id: 'berserker',
  onPlace: (ctx, { cardId, side, row }) => {
    if (rowHasMardroeme(ctx.state, side, row)) transform(ctx, cardId, side, row);
  },
};

export const mardroeme: AbilityDefinition = {
  id: 'mardroeme',
  play: specialSlotPlay,
  onPlace: (ctx, { cardId, side, row }) => {
    announce(ctx, 'mardroeme', { cardId });
    const berserkers = ctx.state.players[side].rows[row].units.filter((id) =>
      defOf(ctx.state, id).abilities.includes('berserker'),
    );
    for (const id of berserkers) transform(ctx, id, side, row);
  },
};

/** Marker for the transformed bear. */
export const vildkarrl: AbilityDefinition = { id: 'vildkarrl' };

export const removalAbilities = [
  scorch,
  scorchRow('scorch_c', 'close'),
  scorchRow('scorch_r', 'ranged'),
  scorchRow('scorch_s', 'siege'),
  decoy,
  berserker,
  mardroeme,
  vildkarrl,
];
