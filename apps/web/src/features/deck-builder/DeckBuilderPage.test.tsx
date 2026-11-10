import { deckStats } from '@gwent/engine';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '@/features/settings';
import { renderWithProviders } from '@/test/render';
import { DeckBuilderPage } from './DeckBuilderPage';
import { selectCurrentDeck, useDecksStore } from './store/decks.store';

const initial = useDecksStore.getState();
const currentDeck = () => selectCurrentDeck(useDecksStore.getState());

beforeEach(() => useDecksStore.setState(initial, true));
afterEach(() => localStorage.clear());

describe('DeckBuilderPage', () => {
  it('shows the current faction and a deck ready to play', () => {
    renderWithProviders(<DeckBuilderPage />);
    expect(screen.getByRole('heading', { name: 'Reinos do Norte' })).toBeInTheDocument();
    expect(screen.getByText('Baralho pronto para jogar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar jogo' })).toBeEnabled();
  });

  it('adds a copy when clicking the collection and removes it when clicking the deck', async () => {
    renderWithProviders(<DeckBuilderPage />);
    const before = deckStats(currentDeck()).total;
    const collection = screen.getByRole('region', { name: 'Coleção de Cartas' });
    await userEvent.click(within(collection).getAllByRole('button', { name: /^Adicionar / })[0]!);
    expect(deckStats(currentDeck()).total).toBe(before + 1);

    const deck = screen.getByRole('region', { name: 'Cartas no Baralho' });
    await userEvent.click(within(deck).getAllByRole('button', { name: /^Remover / })[0]!);
    expect(deckStats(currentDeck()).total).toBe(before);
  });

  it('blocks starting with an incomplete deck and shows the reason', () => {
    useDecksStore.setState((s) => ({
      decks: { ...s.decks, realms: { faction: 'realms', leader: 22, cards: [[27, 1]] } },
    }));
    renderWithProviders(<DeckBuilderPage />);
    expect(screen.getByRole('button', { name: 'Iniciar jogo' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'São necessárias pelo menos 22 unidades (agora: 1).',
    );
  });

  it('shows an error when importing an invalid file', async () => {
    renderWithProviders(<DeckBuilderPage />);
    const file = new File(['this is not json'], 'deck.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Enviar Baralho'), file);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'O baralho enviado não pôde ser lido!',
    );
  });

  it('switches faction and deck when importing a valid deck', async () => {
    renderWithProviders(<DeckBuilderPage />);
    const deck = { faction: 'monsters', leader: 93, cards: [[98, 1]] };
    const file = new File([JSON.stringify(deck)], 'deck.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Enviar Baralho'), file);
    expect(await screen.findByRole('heading', { name: 'Monstros' })).toBeInTheDocument();
    expect(currentDeck()).toEqual(deck);
  });

  it('switches faction with the faction picker', async () => {
    renderWithProviders(<DeckBuilderPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Trocar Facção' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Skellige/ }),
    );
    expect(useDecksStore.getState().faction).toBe('skellige');
  });

  it('saves the chosen computer difficulty for the next match', async () => {
    renderWithProviders(<DeckBuilderPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Opções da partida' }));
    const group = screen.getByRole('radiogroup', { name: 'Dificuldade do computador' });
    expect(within(group).getByRole('radio', { name: 'Normal' })).toBeChecked();
    await userEvent.click(within(group).getByRole('radio', { name: 'Difícil' }));
    expect(within(group).getByRole('radio', { name: 'Difícil' })).toBeChecked();
    expect(useSettingsStore.getState().botDifficulty).toBe('hard');
    useSettingsStore.getState().update({ botDifficulty: 'normal' });
  });

  it('saves the chosen match rules for the next match', async () => {
    renderWithProviders(<DeckBuilderPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Opções da partida' }));
    const rules = screen.getByRole('group', { name: 'Mutadores' });
    await userEvent.click(within(rules).getByRole('checkbox', { name: 'Sem líderes' }));
    await userEvent.click(within(rules).getByRole('checkbox', { name: 'Inspiração' }));
    expect(useSettingsStore.getState().mutators).toEqual(['noLeaders', 'inspiration']);
    await userEvent.click(within(rules).getByRole('checkbox', { name: 'Sem líderes' }));
    expect(useSettingsStore.getState().mutators).toEqual(['inspiration']);
    // The summary next to the button counts the rules
    expect(screen.getByText('Normal · 1 mutador')).toBeInTheDocument();
    useSettingsStore.getState().update({ mutators: [] });
  });
});
