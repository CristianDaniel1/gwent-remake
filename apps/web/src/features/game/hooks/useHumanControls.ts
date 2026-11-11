import {
  defOf,
  getLegalActions,
  naturalSide,
  type CardInstanceId,
  type CombatRow,
  type GameAction,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import { useMemo } from 'react';
import type { BoardMatch } from '../interfaces/match';
import { useGameStore } from '../store/game.store';
import { useUiStore } from '../store/ui.store';
import type { PlayAction, PrimaryAction, TargetOption, Targets } from '../interfaces/controls';

/**
 * Builds the key that identifies a row target.
 *
 * @param side - Owner of the row.
 * @param row - Combat row.
 * @returns The target key.
 */
export const targetKey = (side: PlayerId, row: CombatRow) => `${side}:${row}`;
/**
 * Builds the key that identifies a card target.
 *
 * @param id - Card instance id.
 * @returns The target key.
 */
export const cardKey = (id: CardInstanceId) => `card:${id}`;

const playsOf = (legal: readonly GameAction[], cardId: CardInstanceId) =>
  legal.filter(
    (action): action is PlayAction => action.type === 'PLAY_CARD' && action.cardId === cardId,
  );

const optionsFor = (
  state: GameState,
  human: PlayerId,
  selected: CardInstanceId,
  legal: readonly GameAction[],
): TargetOption[] => {
  if (selected === state.players[human].leader) {
    const canUseLeader = legal.some((action) => action.type === 'ACTIVATE_LEADER');
    return canUseLeader
      ? [{ action: { type: 'ACTIVATE_LEADER', player: human }, key: 'leader', special: false }]
      : [];
  }
  const isUnit = defOf(state, selected).type === 'unit';
  const side = isUnit ? naturalSide(state, selected) : human;
  return playsOf(legal, selected).map((play) => {
    if (play.targetId) return { action: play, key: cardKey(play.targetId), special: false };
    if (play.row) return { action: play, key: targetKey(side, play.row), special: !isUnit };
    return { action: play, key: 'free', special: false };
  });
};

const targetsOf = (options: readonly TargetOption[]): Targets => {
  const targets: Targets = { rows: new Set(), specials: new Set(), cards: new Set(), free: null };
  for (const { action, key, special } of options) {
    if (action.type !== 'PLAY_CARD') continue;
    if (action.targetId) targets.cards.add(action.targetId);
    else if (special) targets.specials.add(key);
    else if (action.row) targets.rows.add(key);
    else targets.free = action;
  }
  return targets;
};

/**
 * Derives what the human can play now and the actions to play it.
 *
 * @param match - Match on the board.
 * @returns Playable cards, targets and play actions.
 */
export const useHumanControls = (match: BoardMatch) => {
  const { state, human } = match;
  const dispatch = useGameStore((store) => store.dispatch);
  const selected = useUiStore((store) => store.selected);
  const targetIndex = useUiStore((store) => store.targetIndex);
  const clearSelected = useUiStore((store) => store.clearSelected);
  const locked =
    (match.mode === 'online' && match.awaiting) ||
    match.mode === 'replay' ||
    match.mode === 'spectate';
  const legal = useMemo(
    () => (locked ? [] : getLegalActions(state, human)),
    [locked, state, human],
  );

  const canPass = legal.some((action) => action.type === 'PASS');
  const canUseLeader = legal.some((action) => action.type === 'ACTIVATE_LEADER');
  const playable: ReadonlySet<CardInstanceId> = new Set(
    legal.flatMap((action) => (action.type === 'PLAY_CARD' ? [action.cardId] : [])),
  );
  const options =
    selected && state.cards[selected] ? optionsFor(state, human, selected, legal) : [];
  const targets = targetsOf(options);
  const focusedKey = options.length ? (options[targetIndex % options.length]?.key ?? null) : null;
  const weatherTarget = !!targets.free && !!selected && defOf(state, selected).type === 'weather';

  const act = (action: GameAction | null | undefined) => {
    if (!action) return;
    clearSelected();
    dispatch(action);
  };
  const playOnRow = (row: CombatRow) => {
    if (selected) act(playsOf(legal, selected).find((play) => play.row === row && !play.targetId));
  };
  const playOnCard = (targetId: CardInstanceId) => {
    if (selected) act(playsOf(legal, selected).find((play) => play.targetId === targetId));
  };
  const pass = () => act({ type: 'PASS', player: human });
  const activateLeader = () => act({ type: 'ACTIVATE_LEADER', player: human });

  const primaryAction = (): PrimaryAction | null => {
    if (selected === state.players[human].leader)
      return canUseLeader ? { kind: 'useLeader', run: activateLeader } : null;
    if (targets.free) return { kind: 'play', run: () => act(targets.free) };
    return null;
  };

  return {
    options,
    targets,
    playable,
    focusedKey,
    weatherTarget,
    primaryAction: primaryAction(),
    canPass,
    canUseLeader,
    act,
    playOnRow,
    playOnCard,
    pass,
  };
};
