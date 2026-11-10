import {
  defOf,
  getLegalActions,
  naturalSide,
  type CardInstanceId,
  type CombatRow,
  type GameAction,
  type PlayerId,
} from '@gwent/engine';
import { useCallback, useMemo } from 'react';
import { useGameStore, type BoardMatch } from '../store/game.store';
import { useUiStore } from '../store/ui.store';

type PlayAction = Extract<GameAction, { type: 'PLAY_CARD' }>;

export const targetKey = (side: PlayerId, row: CombatRow) => `${side}:${row}`;
export const cardKey = (id: CardInstanceId) => `card:${id}`;

/** One play of the selected card and where it happens on the board. */
export interface TargetOption {
  action: GameAction;
  /** "p1:close" (row or slot), "card:<id>" (Decoy), "free" (weather/Scorch) or "leader". */
  key: string;
  /** Goes to the row's special slot (Horn, Mardroeme). */
  special: boolean;
}

export interface Targets {
  rows: Set<string>;
  specials: Set<string>;
  cards: Set<CardInstanceId>;
  free: PlayAction | null;
}

/**
 * What the human can do now, derived from the engine's legal actions
 * (the UI never decides rules on its own).
 */
export function useHumanControls(match: BoardMatch) {
  const { state, human } = match;
  const dispatch = useGameStore((s) => s.dispatch);
  const selected = useUiStore((s) => s.selected);
  const clearSelected = useUiStore((s) => s.clearSelected);
  // Online, with a move on its way to the server, nothing is playable until the answer arrives;
  // a replay or a match being watched is never playable.
  const awaiting =
    (match.mode === 'online' && match.awaiting) ||
    match.mode === 'replay' ||
    match.mode === 'spectate';
  const legal = useMemo(
    () => (awaiting ? [] : getLegalActions(state, human)),
    [awaiting, state, human],
  );
  const canPass = legal.some((a) => a.type === 'PASS');
  const canUseLeader = legal.some((a) => a.type === 'ACTIVATE_LEADER');

  const playsFor = useCallback(
    (cardId: CardInstanceId) =>
      legal.filter((a): a is PlayAction => a.type === 'PLAY_CARD' && a.cardId === cardId),
    [legal],
  );

  /** Plays of the selected card, in keyboard traversal order. */
  const options = useMemo<TargetOption[]>(() => {
    if (!selected || !state.cards[selected]) return [];
    if (selected === state.players[human].leader) {
      return canUseLeader
        ? [{ action: { type: 'ACTIVATE_LEADER', player: human }, key: 'leader', special: false }]
        : [];
    }
    const isUnit = defOf(state, selected).type === 'unit';
    const side = isUnit ? naturalSide(state, selected) : human;
    return playsFor(selected).map((play) => {
      if (play.targetId) return { action: play, key: cardKey(play.targetId), special: false };
      if (play.row) return { action: play, key: targetKey(side, play.row), special: !isUnit };
      return { action: play, key: 'free', special: false };
    });
  }, [selected, state, human, playsFor, canUseLeader]);

  const targets = useMemo<Targets>(() => {
    const result: Targets = { rows: new Set(), specials: new Set(), cards: new Set(), free: null };
    for (const option of options) {
      const play = option.action.type === 'PLAY_CARD' ? option.action : null;
      if (!play) continue;
      if (play.targetId) result.cards.add(play.targetId);
      else if (option.special) result.specials.add(option.key);
      else if (play.row) result.rows.add(option.key);
      else result.free = play;
    }
    return result;
  }, [options]);

  const act = useCallback(
    (action: GameAction | null | undefined) => {
      if (!action) return;
      clearSelected();
      dispatch(action);
    },
    [clearSelected, dispatch],
  );

  /** Click on a row (or special slot) with a card selected. */
  const playOnRow = useCallback(
    (row: CombatRow) => {
      if (!selected) return;
      act(playsFor(selected).find((p) => p.row === row && !p.targetId));
    },
    [act, playsFor, selected],
  );

  /** Click on a board card with Decoy selected. */
  const playOnCard = useCallback(
    (targetId: CardInstanceId) => {
      if (!selected) return;
      act(playsFor(selected).find((p) => p.targetId === targetId));
    },
    [act, playsFor, selected],
  );

  return {
    legal,
    options,
    targets,
    act,
    playOnRow,
    playOnCard,
    canPass,
    canUseLeader,
    pass: () => act({ type: 'PASS', player: human }),
    useLeader: () => act({ type: 'ACTIVATE_LEADER', player: human }),
  };
}
