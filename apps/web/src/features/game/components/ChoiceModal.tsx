import type { CardInstanceId, GameState, PendingChoice, PlayerId } from '@gwent/engine';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useGameStore } from '../store/game.store';
import { CardCarousel } from './CardCarousel';

const KNOWN_KINDS = new Set([
  'medic',
  'agileRow',
  'firstPlayer',
  'discard',
  'drawFromDeck',
  'weatherFromDeck',
  'stealFromGrave',
  'returnFromGrave',
]);

type ChoiceModalProps = { state: GameState; choice: PendingChoice; human: PlayerId };

/**
 * The human's pending choice. Card choices use the carousel (clicking the center picks;
 * in a multiple choice, it marks and then confirms); row or who-starts choices use buttons.
 */
export function ChoiceModal({ state, choice, human }: ChoiceModalProps) {
  const { t } = useTranslation();
  const dispatch = useGameStore((s) => s.dispatch);
  const [picked, setPicked] = useState<string[]>([]);
  const kind = KNOWN_KINDS.has(choice.kind) ? choice.kind : 'generic';
  const title = t(`match.choice.${kind}` as 'match.choice.generic', { count: choice.min });

  const send = (optionIds: string[]) => dispatch({ type: 'CHOOSE', player: human, optionIds });
  const single = choice.max === 1;
  const toggle = (id: string) => {
    if (single) return send([id]);
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < choice.max ? [...p, id] : p,
    );
  };
  const canConfirm = picked.length >= choice.min && picked.length <= choice.max;
  const confirm = !single && (
    <Button disabled={!canConfirm} onClick={() => send(picked)}>
      {t('match.confirm')} ({picked.length}/{choice.max})
    </Button>
  );

  // Option of each card (the carousel works with cards; the choice, with options)
  const optionByCard = useMemo(
    () =>
      new Map(
        choice.options.flatMap((o) => (o.cardId ? [[o.cardId, o.id] as const] : [])),
      ) as ReadonlyMap<CardInstanceId, string>,
    [choice.options],
  );

  if (optionByCard.size === choice.options.length && optionByCard.size > 0) {
    const marked = new Set(
      [...optionByCard].filter(([, option]) => picked.includes(option)).map(([card]) => card),
    );
    return (
      <CardCarousel
        state={state}
        title={title}
        cardIds={[...optionByCard.keys()]}
        selectLabel={t('match.pick')}
        onSelect={(card) => {
          const option = optionByCard.get(card);
          if (option) toggle(option);
        }}
        marked={marked}
        footer={confirm}
      />
    );
  }

  const label = (option: PendingChoice['options'][number]) => {
    if (option.row) return t(`match.choice.${option.row}`);
    if (option.player)
      return t(option.player === human ? 'match.choice.me' : 'match.choice.opponent');
    return option.id;
  };

  return (
    <Modal title={title} footer={confirm}>
      {choice.options.map((option) => (
        <Button key={option.id} onClick={() => toggle(option.id)}>
          {label(option)}
        </Button>
      ))}
    </Modal>
  );
}
