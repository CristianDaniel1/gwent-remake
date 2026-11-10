import type { GameAction } from '@gwent/engine';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { sfx } from '@/shared/audio/audio-manager';
import type { BoardMatch } from '../store/game.store';
import { useUiStore } from '../store/ui.store';

/** Passing the round requires holding P/F for this long (avoids passing by accident). */
export const PASS_HOLD_MS = 1000;

export interface KeyboardControlsInput {
  match: BoardMatch;
  /** Off while watching a replay (the replay page has its own keys). */
  enabled: boolean;
  /** Possible plays of the selected card, in keyboard traversal order. */
  options: readonly GameAction[];
  playable: ReadonlySet<string>;
  canPass: boolean;
  canUseLeader: boolean;
  act: (action: GameAction | undefined) => void;
  pass: () => void;
  /** Title of the hand carousel (V key). */
  handTitle: string;
}

/**
 * Shortcuts: ←/→ (A/D) move through the hand; ↑/↓ (W/S) choose the target; Enter/Space
 * confirm; Esc/Q/Backspace cancel; P/F (hold 1 s) pass; L/E select the leader;
 * V/Z show the card in detail; H or ? show the legend.
 */
export function useKeyboardControls(input: KeyboardControlsInput) {
  // The listener is registered once and always reads the data from the latest render.
  const latest = useRef(input);
  useLayoutEffect(() => {
    latest.current = input;
  });

  useEffect(() => {
    let passTimer: ReturnType<typeof setTimeout> | null = null;
    const ui = () => useUiStore.getState();

    const stopPassHold = () => {
      if (passTimer) clearTimeout(passTimer);
      passTimer = null;
      if (ui().passHolding) ui().setPassHolding(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!latest.current.enabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest('input, select, textarea')) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const { match, options, playable, canPass, canUseLeader, act } = latest.current;
      const state = ui();

      if (key === 'h' || key === '?') {
        e.preventDefault();
        state.setHelpOpen(!state.helpOpen);
        return;
      }
      // Dialogs (choices, redraw, legend…) handle their own keyboard.
      if (document.querySelector('[role="dialog"]:not([aria-hidden="true"])')) return;

      const hand = match.state.players[match.human].hand;
      const moveFocus = (step: number) => {
        if (hand.length === 0) return;
        const next = Math.min(
          hand.length - 1,
          Math.max(0, (state.focusIndex ?? (step > 0 ? -1 : hand.length)) + step),
        );
        state.setFocusIndex(next);
        state.hover(hand[next] ?? null);
        sfx.play('ui_card');
      };
      const moveTarget = (step: number) => {
        if (options.length === 0) return;
        state.setTargetIndex((state.targetIndex + step + options.length) % options.length);
      };

      switch (key) {
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          if (state.selected) moveTarget(-1);
          else moveFocus(-1);
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          if (state.selected) moveTarget(1);
          else moveFocus(1);
          break;
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          if (state.selected) moveTarget(-1);
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          if (state.selected) moveTarget(1);
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (state.selected) {
            act(options[state.targetIndex % Math.max(1, options.length)]);
            state.setFocusIndex(null);
            break;
          }
          const focused = state.focusIndex === null ? undefined : hand[state.focusIndex];
          if (focused && playable.has(focused)) {
            state.toggleSelected(focused);
            sfx.play('open');
          }
          break;
        }
        case 'Escape':
        case 'q':
        case 'Backspace':
          e.preventDefault();
          state.clearSelected();
          break;
        case 'v':
        case 'z': {
          // View in detail: the focused card (or the selected or hovered one) in the hand carousel
          e.preventDefault();
          const focusedId = state.focusIndex === null ? undefined : hand[state.focusIndex];
          const startId = state.selected ?? focusedId ?? state.hovered ?? hand[0];
          if (!startId) break;
          const inHand = hand.includes(startId);
          sfx.play('open');
          state.view({
            title: latest.current.handTitle,
            cardIds: inHand ? hand : [startId],
            startId,
          });
          break;
        }
        case 'l':
        case 'e':
          e.preventDefault();
          if (canUseLeader) state.toggleSelected(match.state.players[match.human].leader);
          break;
        case 'p':
        case 'f':
          e.preventDefault();
          if (e.repeat || passTimer || !canPass || state.selected) break;
          state.setPassHolding(true);
          passTimer = setTimeout(() => {
            passTimer = null;
            ui().setPassHolding(false);
            latest.current.pass();
          }, PASS_HOLD_MS);
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'p' || key === 'f') stopPassHold();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      stopPassHold();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}
