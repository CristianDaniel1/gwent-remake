import { validateDeck } from '@gwent/engine';
import { Server } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { ServerDecksModal } from '@/features/server';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { BackButton } from '@/shared/ui/BackButton';
import { Stage } from '@/shared/ui/Stage';
import { CardPanel } from './components/CardPanel';
import { DeckSummary } from './components/DeckSummary';
import { FactionHeader } from './components/FactionHeader';
import { OpponentPicker } from './components/OpponentPicker';
import { useDeckFileReader } from './hooks/useDeckFileReader';
import { collectionCards, deckCards } from './lib/panel-cards';
import { selectCurrentDeck, useDecksStore } from './store/decks.store';

export const DeckBuilderPage = () => {
  const { t: translate } = useTranslation();
  const { t: translateGame } = useTranslation('game');
  const navigate = useNavigate();
  const deck = useDecksStore(selectCurrentDeck);
  const opponent = useDecksStore((store) => store.opponent);
  const { setFaction, setLeader, addCard, removeCard, importDeck, setOpponent } = useDecksStore(
    useShallow((store) => ({
      setFaction: store.setFaction,
      setLeader: store.setLeader,
      addCard: store.addCard,
      removeCard: store.removeCard,
      importDeck: store.importDeck,
      setOpponent: store.setOpponent,
    })),
  );
  const { message, setMessage, readDeck } = useDeckFileReader();
  const [serverOpen, setServerOpen] = useState(false);
  useEffect(() => sfx.play('menu_opening'), []);

  const importOwnDeck = (text: string) => {
    const imported = readDeck(text);
    if (!imported) return;
    importDeck(imported);
    setMessage(translate('deckBuilder.imported'));
  };

  const importOpponentDeck = (text: string) => {
    const custom = readDeck(text);
    if (!custom) return;
    if (validateDeck(custom).length) setMessage(translate('deckBuilder.opponentInvalid'));
    else setOpponent({ kind: 'custom', deck: custom });
  };

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 grid grid-cols-[1fr_0.55fr_1fr] grid-rows-[auto_1fr] gap-x-[2cqw] gap-y-[1cqw] bg-black/80 px-[6cqw] pt-[1.5cqw] pb-[2cqw]">
        <BackButton onClick={() => void navigate('/')} />
        <button
          type="button"
          onClick={() => setServerOpen(true)}
          className="absolute top-[1cqw] right-[1cqw] flex cursor-pointer items-center gap-[0.4cqw] text-[1cqw] hover:text-gold"
        >
          <Server aria-hidden className="size-[1.2cqw]" />
          {translate('server.button')}
        </button>

        <div className="col-span-3">
          <FactionHeader deck={deck} onFaction={setFaction} onImport={importOwnDeck} />
          {message && (
            <p role="status" className="mt-[0.4cqw] text-center text-[1cqw] text-amber-300">
              {message}
            </p>
          )}
        </div>

        <CardPanel
          title={translateGame('deck.cardCollection')}
          cards={collectionCards(deck)}
          actionLabel={(name) => translate('deckBuilder.addCard', { card: name })}
          onCardClick={(def) => {
            sfx.play('ui_card_bank');
            addCard(def.id);
          }}
        />

        <div className="flex flex-col items-center justify-between gap-[1cqw] overflow-y-auto">
          <DeckSummary
            deck={deck}
            onLeader={setLeader}
            onStart={() => {
              if (!validateDeck(deck).length) void navigate('/game');
            }}
          />
          <OpponentPicker
            opponent={opponent}
            onUpload={importOpponentDeck}
            onRandom={() => setOpponent({ kind: 'random' })}
          />
        </div>

        <CardPanel
          title={translateGame('deck.cardsInDeck')}
          cards={deckCards(deck)}
          actionLabel={(name) => translate('deckBuilder.removeCard', { card: name })}
          onCardClick={(def) => {
            sfx.play('ui_card_bank');
            removeCard(def.id);
          }}
        />
      </div>
      <AnimatePresence>
        {serverOpen && (
          <ServerDecksModal
            current={deck}
            onLoad={importDeck}
            onClose={() => setServerOpen(false)}
          />
        )}
      </AnimatePresence>
    </Stage>
  );
};
