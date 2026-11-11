import { findCardDef, validateDeck, type DeckList } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';
import { Button } from '@/shared/ui/Button';
import { GameCard } from '@/shared/ui/GameCard';
import { useIssueText } from '../hooks/useIssueText';
import { DeckStats } from './DeckStats';
import { LeaderPickerModal } from './LeaderPickerModal';

interface DeckSummaryProps {
  deck: DeckList;
  onLeader: (leader: number) => void;
  onStart: () => void;
}

export const DeckSummary = ({ deck, onLeader, onStart }: DeckSummaryProps) => {
  const { t: translate } = useTranslation();
  const { t: translateGame } = useTranslation('game');
  const cardText = useCardText();
  const issueText = useIssueText();
  const [choosingLeader, setChoosingLeader] = useState(false);
  const issues = validateDeck(deck);
  const leader = findCardDef(deck.leader);

  return (
    <section className="flex flex-col items-center gap-[0.5cqw] text-center">
      <h2 className="text-[1.2cqw] text-gold">{translateGame('deck.leader')}</h2>
      {leader && (
        <div className="h-[11cqw] w-[5.8cqw]">
          <GameCard
            def={leader}
            size="fill"
            label={`${translateGame('deck.leader')}: ${cardText(leader).name}`}
            onClick={() => setChoosingLeader(true)}
          />
        </div>
      )}

      <DeckStats deck={deck} />

      {issues.length ? (
        <div role="alert" className="text-[0.85cqw] text-red-300">
          <p>{translate('deckBuilder.issuesTitle')}</p>
          <ul>
            {issues.map((issue, index) => (
              <li key={index}>{issueText(issue)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[0.85cqw] text-lime-300">{translate('deckBuilder.ready')}</p>
      )}

      <Button disabled={!!issues.length} onClick={onStart}>
        {translateGame('deck.startGame')}
      </Button>

      <AnimatePresence>
        {choosingLeader && (
          <LeaderPickerModal
            faction={deck.faction}
            current={deck.leader}
            onPick={(id) => {
              onLeader(id);
              setChoosingLeader(false);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
