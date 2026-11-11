import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import {
  CAROUSEL_CLOSE_KEYS,
  CAROUSEL_CONFIRM_KEYS,
  CAROUSEL_NEXT_KEYS,
  CAROUSEL_PREVIOUS_KEYS,
  CAROUSEL_CARDS_KEYS,
  CAROUSEL_FOOTER_KEYS,
} from '../data/keyboard';

interface CarouselKeyHandlers {
  shift: (step: number) => void;
  select: () => void;
  onClose?: (() => void) | undefined;
}

const isFrontCarousel = (dialog: HTMLElement | null) =>
  [...document.querySelectorAll('[data-carousel]')].at(-1) === dialog;

/**
 * Handles the keyboard while a card carousel is the front dialog.
 *
 * @param dialogRef - Carousel dialog element.
 * @param active - Whether the carousel is on screen and not closing.
 * @param handlers - Actions for moving, picking and closing.
 */
export const useCarouselKeys = (
  dialogRef: RefObject<HTMLElement | null>,
  active: boolean,
  handlers: CarouselKeyHandlers,
) => {
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || !isFrontCarousel(dialogRef.current))
        return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const { shift, select, onClose } = latest.current;
      const footerButton = dialogRef.current?.querySelector<HTMLElement>(
        'footer button:not([disabled])',
      );

      if (CAROUSEL_PREVIOUS_KEYS.has(key)) shift(-1);
      else if (CAROUSEL_NEXT_KEYS.has(key)) shift(1);
      else if (CAROUSEL_FOOTER_KEYS.has(key) && footerButton)
        footerButton.focus({ focusVisible: true } as FocusOptions);
      else if (CAROUSEL_CARDS_KEYS.has(key)) (document.activeElement as HTMLElement | null)?.blur();
      else if (CAROUSEL_CONFIRM_KEYS.has(key)) {
        if ((event.target as HTMLElement | null)?.closest?.('footer button')) return;
        select();
      } else if (CAROUSEL_CLOSE_KEYS.has(key) && onClose) onClose();
      else return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, dialogRef]);
};
