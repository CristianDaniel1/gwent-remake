import type { CardInstanceId, GameState, PendingChoice, PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useChoicePicks } from '../hooks/useChoicePicks';
import { useGameStore } from '../store/game.store';
import { CardCarousel } from './CardCarousel';
import { KNOWN_CHOICE_KINDS } from '../data/choices';
import type { ChoiceOption } from '../interfaces/choice';

interface ChoiceModalProps {
  state: GameState;
  choice: PendingChoice;
  human: PlayerId;
}

export const ChoiceModal = ({ state, choice, human }: ChoiceModalProps) => {
  const { t: translate } = useTranslation();
  const dispatch = useGameStore((store) => store.dispatch);
  const { picked, single, toggle, canConfirm, confirm } = useChoicePicks(choice, (optionIds) =>
    dispatch({ type: 'CHOOSE', player: human, optionIds }),
  );
  const kind = KNOWN_CHOICE_KINDS.has(choice.kind) ? choice.kind : 'generic';
  const title = translate(`match.choice.${kind}` as 'match.choice.generic', { count: choice.min });
  const confirmButton = !single && (
    <Button disabled={!canConfirm} onClick={confirm}>
      {translate('match.confirm')} ({picked.length}/{choice.max})
    </Button>
  );

  const optionByCard: ReadonlyMap<CardInstanceId, string> = new Map(
    choice.options.flatMap((option) =>
      option.cardId ? [[option.cardId, option.id] as const] : [],
    ),
  );
  const isCardChoice = optionByCard.size > 0 && optionByCard.size === choice.options.length;

  if (isCardChoice) {
    const marked = new Set(
      [...optionByCard].filter(([, option]) => picked.includes(option)).map(([card]) => card),
    );
    return (
      <CardCarousel
        state={state}
        title={title}
        cardIds={[...optionByCard.keys()]}
        selectLabel={translate('match.pick')}
        onSelect={(card) => {
          const option = optionByCard.get(card);
          if (option) toggle(option);
        }}
        marked={marked}
        footer={confirmButton}
      />
    );
  }

  const label = (option: ChoiceOption) => {
    if (option.row) return translate(`match.choice.${option.row}`);
    if (option.player)
      return translate(option.player === human ? 'match.choice.me' : 'match.choice.opponent');
    return option.id;
  };

  return (
    <Modal title={title} footer={confirmButton}>
      {choice.options.map((option) => (
        <Button key={option.id} onClick={() => toggle(option.id)}>
          {label(option)}
        </Button>
      ))}
    </Modal>
  );
};
