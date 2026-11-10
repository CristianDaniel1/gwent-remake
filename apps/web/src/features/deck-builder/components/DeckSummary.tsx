import {
  deckStats,
  findCardDef,
  leadersOf,
  validateDeck,
  type DeckIssue,
  type DeckList,
} from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';
import { assets } from '@/shared/lib/assets';
import { Button } from '@/shared/ui/Button';
import { GameCard } from '@/shared/ui/GameCard';
import { Modal } from '@/shared/ui/Modal';

type DeckSummaryProps = {
  deck: DeckList;
  onLeader: (leader: number) => void;
  onStart: () => void;
};

/** Translated text for a deck issue. */
function useIssueText() {
  const { t } = useTranslation();
  const cardText = useCardText();
  const cardName = (id: number) => {
    const def = findCardDef(id);
    return def ? cardText(def).name : String(id);
  };
  return (issue: DeckIssue) =>
    t(`deckBuilder.issue.${issue.code}`, {
      ...issue,
      ...('cardId' in issue ? { card: cardName(issue.cardId) } : {}),
    });
}

/** Middle column: leader, deck numbers, issues and the start button. */
export function DeckSummary({ deck, onLeader, onStart }: DeckSummaryProps) {
  const { t } = useTranslation();
  const tGame = useTranslation('game').t;
  const cardText = useCardText();
  const issueText = useIssueText();
  const [choosingLeader, setChoosingLeader] = useState(false);
  const stats = deckStats(deck);
  const issues = validateDeck(deck);
  const leader = findCardDef(deck.leader);

  const rows = [
    { label: tGame('deck.totalCards'), icon: 'deck_stats_count', value: stats.total },
    { label: tGame('deck.unitCards'), icon: 'deck_stats_unit', value: stats.units },
    {
      label: tGame('deck.specialCards'),
      icon: 'deck_stats_special',
      value: `${stats.specials}/10`,
    },
    { label: tGame('deck.totalStrength'), icon: 'deck_stats_strength', value: stats.strength },
    { label: tGame('deck.heroCards'), icon: 'deck_stats_hero', value: stats.heroes },
  ];

  return (
    <section className="flex flex-col items-center gap-[0.5cqw] text-center">
      <h2 className="text-[1.2cqw] text-gold">{tGame('deck.leader')}</h2>
      {leader && (
        <div className="h-[11cqw] w-[5.8cqw]">
          <GameCard
            def={leader}
            size="fill"
            label={`${tGame('deck.leader')}: ${cardText(leader).name}`}
            onClick={() => setChoosingLeader(true)}
          />
        </div>
      )}

      <dl className="flex flex-col items-center gap-[0.15cqw]">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col items-center">
            <dt className="text-[0.95cqw] text-[tan]">{row.label}</dt>
            <dd className="flex items-center gap-[0.3cqw] text-[1.2cqw]">
              <span
                aria-hidden
                className="size-[1.1cqw] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${assets.icon(row.icon)})` }}
              />
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {issues.length > 0 ? (
        <div role="alert" className="text-[0.85cqw] text-red-300">
          <p>{t('deckBuilder.issuesTitle')}</p>
          <ul>
            {issues.map((issue, i) => (
              <li key={i}>{issueText(issue)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[0.85cqw] text-lime-300">{t('deckBuilder.ready')}</p>
      )}

      <Button disabled={issues.length > 0} onClick={onStart}>
        {tGame('deck.startGame')}
      </Button>

      <AnimatePresence>
        {choosingLeader && (
          <Modal title={t('deckBuilder.chooseLeader')}>
            {leadersOf(deck.faction).map((def) => (
              <div key={def.id} className="flex w-[8cqw] flex-col gap-[0.4cqw]">
                <div className="h-[15.1cqw] w-full">
                  <GameCard
                    def={def}
                    size="fill"
                    label={cardText(def).name}
                    selected={def.id === deck.leader}
                    onClick={() => {
                      onLeader(def.id);
                      setChoosingLeader(false);
                    }}
                  />
                </div>
                {/* The artwork only has the quote: the translated ability goes here */}
                <p className="text-[0.75cqw] leading-snug">
                  {cardText(def).abilities[0]?.description}
                </p>
              </div>
            ))}
          </Modal>
        )}
      </AnimatePresence>
    </section>
  );
}
