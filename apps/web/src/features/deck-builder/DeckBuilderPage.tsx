import { copiesInDeck, deckPool, findCardDef, validateDeck } from '@gwent/engine';
import { ArrowLeft, Server } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ServerDecksModal } from '@/features/server';
import { useShallow } from 'zustand/react/shallow';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { Stage } from '@/shared/ui/Stage';
import { CardPanel, type PanelCard } from './components/CardPanel';
import { DeckSummary } from './components/DeckSummary';
import { FactionHeader } from './components/FactionHeader';
import { OpponentPicker } from './components/OpponentPicker';
import { copiesLeft } from './lib/deck-edit';
import { parseDeckFile } from './lib/deck-file';
import { selectCurrentDeck, useDecksStore } from './store/decks.store';

/** Deck building (collection on the left, deck on the right). */
export function DeckBuilderPage() {
  const { t } = useTranslation();
  const tGame = useTranslation('game').t;
  const navigate = useNavigate();
  const deck = useDecksStore(selectCurrentDeck);
  const opponent = useDecksStore((s) => s.opponent);
  const { setFaction, setLeader, addCard, removeCard, importDeck, setOpponent } = useDecksStore(
    useShallow((s) => ({
      setFaction: s.setFaction,
      setLeader: s.setLeader,
      addCard: s.addCard,
      removeCard: s.removeCard,
      importDeck: s.importDeck,
      setOpponent: s.setOpponent,
    })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [serverOpen, setServerOpen] = useState(false);
  useEffect(() => sfx.play('menu_opening'), []);

  const collection = useMemo<PanelCard[]>(
    () =>
      deckPool(deck.faction)
        .map((def) => ({
          def,
          count: copiesLeft(deck, def.id),
          enabled: copiesLeft(deck, def.id) > 0,
        }))
        .filter((c) => c.count > 0),
    [deck],
  );
  const inDeck = useMemo<PanelCard[]>(
    () =>
      deck.cards.flatMap(([id]) => {
        const def = findCardDef(id);
        return def ? [{ def, count: copiesInDeck(deck, id), enabled: true }] : [];
      }),
    [deck],
  );

  /** Reads a deck file; returns the deck or shows an error. */
  const readDeck = (text: string) => {
    const result = parseDeckFile(text);
    if (!result.ok) {
      setMessage(
        tGame(result.error === 'notParsable' ? 'deck.uploadNotParsable' : 'deck.uploadBadFormat'),
      );
      return null;
    }
    setMessage(null);
    return result.deck;
  };

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 grid grid-cols-[1fr_0.55fr_1fr] grid-rows-[auto_1fr] gap-x-[2cqw] gap-y-[1cqw] bg-black/80 px-[6cqw] pt-[1.5cqw] pb-[2cqw]">
        <button
          type="button"
          onClick={() => void navigate('/')}
          className="absolute top-[1cqw] left-[1cqw] flex cursor-pointer items-center gap-[0.4cqw] text-[1cqw] hover:text-gold"
        >
          <ArrowLeft aria-hidden className="size-[1.2cqw]" />
          {t('deckBuilder.back')}
        </button>

        <button
          type="button"
          onClick={() => setServerOpen(true)}
          className="absolute top-[1cqw] right-[1cqw] flex cursor-pointer items-center gap-[0.4cqw] text-[1cqw] hover:text-gold"
        >
          <Server aria-hidden className="size-[1.2cqw]" />
          {t('server.button')}
        </button>

        <div className="col-span-3">
          <FactionHeader
            deck={deck}
            onFaction={setFaction}
            onImport={(text) => {
              const imported = readDeck(text);
              if (imported) {
                importDeck(imported);
                setMessage(t('deckBuilder.imported'));
              }
            }}
          />
          {message && (
            <p role="status" className="mt-[0.4cqw] text-center text-[1cqw] text-amber-300">
              {message}
            </p>
          )}
        </div>

        <CardPanel
          title={tGame('deck.cardCollection')}
          cards={collection}
          actionLabel={(name) => t('deckBuilder.addCard', { card: name })}
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
              if (validateDeck(deck).length === 0) void navigate('/game');
            }}
          />
          <OpponentPicker
            opponent={opponent}
            onUpload={(text) => {
              const custom = readDeck(text);
              if (!custom) return;
              // The bot plays with it directly: it must be a valid deck.
              if (validateDeck(custom).length > 0) setMessage(t('deckBuilder.opponentInvalid'));
              else setOpponent({ kind: 'custom', deck: custom });
            }}
            onRandom={() => setOpponent({ kind: 'random' })}
          />
        </div>

        <CardPanel
          title={tGame('deck.cardsInDeck')}
          cards={inDeck}
          actionLabel={(name) => t('deckBuilder.removeCard', { card: name })}
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
}
