import type { CardInstanceId, GameAction } from '@gwent/engine';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { sfx } from '@/shared/audio/audio-manager';
import { isDialogOpen } from '@/shared/lib/dialog';
import { PASS_HOLD_MS } from '../constants/timings';
import type { BoardMatch } from '../interfaces/match';
import { useUiStore } from '../store/ui.store';
import { KEY_COMMANDS, HELP_KEYS, PASS_KEYS } from '../data/keyboard';
import type { KeyboardCommand } from '../interfaces/keyboard';

export interface KeyboardControlsInput {
  match: BoardMatch;
  enabled: boolean;
  options: readonly GameAction[];
  playable: ReadonlySet<CardInstanceId>;
  canPass: boolean;
  canUseLeader: boolean;
  act: (action: GameAction | undefined) => void;
  pass: () => void;
  handTitle: string;
}

const ui = () => useUiStore.getState();

const normalizeKey = (event: KeyboardEvent) =>
  event.key.length === 1 ? event.key.toLowerCase() : event.key;

const isTyping = (event: KeyboardEvent) =>
  !!(event.target as HTMLElement | null)?.closest('input, select, textarea');

const focusedHandCard = (hand: readonly CardInstanceId[]) => {
  const { focusIndex } = ui();
  return focusIndex === null ? undefined : hand[focusIndex];
};

const moveHandFocus = (hand: readonly CardInstanceId[], step: number) => {
  if (!hand.length) return;
  const { focusIndex, setFocusIndex, hover } = ui();
  const from = focusIndex ?? (step > 0 ? -1 : hand.length);
  const next = Math.min(hand.length - 1, Math.max(0, from + step));
  setFocusIndex(next);
  hover(hand[next] ?? null);
  sfx.play('ui_card');
};

const moveTarget = (count: number, step: number) => {
  if (count === 0) return;
  const { targetIndex, setTargetIndex } = ui();
  setTargetIndex((targetIndex + step + count) % count);
};

const runCommand = (command: KeyboardCommand, input: KeyboardControlsInput) => {
  const { match, options, playable, canUseLeader, act, handTitle } = input;
  const hand = match.state.players[match.human].hand;
  const state = ui();

  switch (command) {
    case 'previous':
    case 'next': {
      const step = command === 'next' ? 1 : -1;
      if (state.selected) moveTarget(options.length, step);
      else moveHandFocus(hand, step);
      break;
    }
    case 'up':
    case 'down':
      if (state.selected) moveTarget(options.length, command === 'down' ? 1 : -1);
      break;
    case 'confirm': {
      if (state.selected) {
        act(options[state.targetIndex % Math.max(1, options.length)]);
        state.setFocusIndex(null);
        break;
      }
      const focused = focusedHandCard(hand);
      if (focused && playable.has(focused)) {
        state.toggleSelected(focused);
        sfx.play('open');
      }
      break;
    }
    case 'cancel':
      state.clearSelected();
      break;
    case 'details': {
      const startId = state.selected ?? focusedHandCard(hand) ?? state.hovered ?? hand[0];
      if (!startId) break;
      sfx.play('open');
      state.view({ title: handTitle, cardIds: hand.includes(startId) ? hand : [startId], startId });
      break;
    }
    case 'leader':
      if (canUseLeader) state.toggleSelected(match.state.players[match.human].leader);
      break;
  }
};

/**
 * Handles the match keyboard shortcuts.
 *
 * @param input - Match, plays and actions the shortcuts use.
 */
export const useKeyboardControls = (input: KeyboardControlsInput) => {
  const latest = useRef(input);
  useLayoutEffect(() => {
    latest.current = input;
  });

  useEffect(() => {
    let passTimer: ReturnType<typeof setTimeout> | null = null;

    const stopPassHold = () => {
      if (passTimer) clearTimeout(passTimer);
      passTimer = null;
      if (ui().passHolding) ui().setPassHolding(false);
    };

    const startPassHold = () => {
      const { canPass, pass } = latest.current;
      if (passTimer || !canPass || ui().selected) return;
      ui().setPassHolding(true);
      passTimer = setTimeout(() => {
        passTimer = null;
        ui().setPassHolding(false);
        pass();
      }, PASS_HOLD_MS);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !latest.current.enabled ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTyping(event)
      )
        return;
      const key = normalizeKey(event);

      if (HELP_KEYS.has(key)) {
        event.preventDefault();
        ui().setHelpOpen(!ui().helpOpen);
        return;
      }
      if (isDialogOpen()) return;

      if (PASS_KEYS.has(key)) {
        event.preventDefault();
        if (!event.repeat) startPassHold();
        return;
      }
      const command = KEY_COMMANDS[key];
      if (!command) return;
      event.preventDefault();
      runCommand(command, latest.current);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (PASS_KEYS.has(normalizeKey(event))) stopPassHold();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      stopPassHold();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
};
