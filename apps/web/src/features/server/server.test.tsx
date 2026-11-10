import { PREMADE_DECKS, type DeckList } from '@gwent/engine';
import type { DeckRecord, MatchSummary } from '@gwent/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiServer, http, HttpResponse } from '@/test/msw';
import { renderWithProviders } from '@/test/render';
import { ServerDecksModal } from './components/ServerDecksModal';
import { HistoryPage } from './HistoryPage';
import { useProfileStore } from './store/profile.store';

const PROFILE = { id: '11111111-1111-4111-8111-111111111111', name: 'Ciri' };
const deck = PREMADE_DECKS[0] as DeckList;

const online = () =>
  apiServer.use(http.get('*/api/health', () => HttpResponse.json({ status: 'ok' })));

afterEach(() => useProfileStore.setState({ profile: null }));

describe('server decks', () => {
  it('explains and keeps working when the server is down', async () => {
    renderWithProviders(<ServerDecksModal current={deck} onLoad={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/Servidor offline/)).toBeInTheDocument();
  });

  it('creates the profile by name when there is none', async () => {
    online();
    apiServer.use(
      http.post('*/api/profiles', async ({ request }) => {
        const { name } = (await request.json()) as { name: string };
        return HttpResponse.json(
          { id: PROFILE.id, name, createdAt: '2026-01-01T00:00:00.000Z' },
          { status: 201 },
        );
      }),
      http.get('*/api/profiles/:id/decks', () => HttpResponse.json([])),
    );
    renderWithProviders(<ServerDecksModal current={deck} onLoad={vi.fn()} onClose={vi.fn()} />);
    await userEvent.type(await screen.findByLabelText('Seu nome'), 'Ciri');
    await userEvent.click(screen.getByRole('button', { name: 'Criar perfil no servidor' }));
    expect(await screen.findByText('Perfil: Ciri')).toBeInTheDocument();
    expect(useProfileStore.getState().profile).toEqual(PROFILE);
  });

  it('saves the current deck and loads a deck from the server', async () => {
    online();
    useProfileStore.setState({ profile: PROFILE });
    const saved: DeckRecord[] = [];
    apiServer.use(
      http.get('*/api/profiles/:id/decks', () => HttpResponse.json(saved)),
      http.post('*/api/profiles/:id/decks', async ({ request }) => {
        const body = (await request.json()) as { name: string; deck: DeckList };
        const record = {
          id: '22222222-2222-4222-8222-222222222222',
          ...body,
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
        saved.push(record as DeckRecord);
        return HttpResponse.json(record, { status: 201 });
      }),
    );
    const onLoad = vi.fn();
    renderWithProviders(<ServerDecksModal current={deck} onLoad={onLoad} onClose={vi.fn()} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Salvar baralho atual' }));
    expect(await screen.findByText('Baralho salvo no servidor')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Carregar' }));
    expect(onLoad).toHaveBeenCalledWith(deck);
  });
});

describe('HistoryPage', () => {
  it("lists the matches with opponent, result and round scores from the profile's side", async () => {
    online();
    useProfileStore.setState({ profile: PROFILE });
    const match: MatchSummary = {
      id: '33333333-3333-4333-8333-333333333333',
      mode: 'online',
      // The profile played as p2: its scores come second in the API but first on screen
      side: 'p2',
      faction: 'realms',
      opponent: 'monsters',
      opponentName: 'Ciri',
      mutators: [],
      result: 'win',
      rounds: [
        { round: 1, winner: 'p2', scores: { p1: 40, p2: 50 } },
        { round: 2, winner: 'p2', scores: { p1: 20, p2: 30 } },
      ],
      createdAt: '2026-01-01T12:00:00.000Z',
    };
    apiServer.use(http.get('*/api/profiles/:id/matches', () => HttpResponse.json([match])));
    renderWithProviders(<HistoryPage />);
    expect(await screen.findByText('Vitória')).toBeInTheDocument();
    expect(screen.getByText('Reinos do Norte')).toBeInTheDocument();
    expect(screen.getByText('Monstros')).toBeInTheDocument();
    expect(screen.getByText('Ciri')).toBeInTheDocument();
    expect(screen.getByText(/50–40\s+30–20/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assistir replay de/ })).toBeInTheDocument();
  });

  it('shows an error when the opened replay file is invalid', async () => {
    online();
    useProfileStore.setState({ profile: PROFILE });
    apiServer.use(http.get('*/api/profiles/:id/matches', () => HttpResponse.json([])));
    const { container } = renderWithProviders(<HistoryPage />);
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!;
    await userEvent.upload(input, new File(['{}'], 'replay.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esse arquivo não é um replay válido.',
    );
  });

  it('goes back to the profile form when the profile was deleted on the server (404)', async () => {
    online();
    useProfileStore.setState({ profile: PROFILE });
    apiServer.use(
      http.get('*/api/profiles/:id/matches', () =>
        HttpResponse.json(
          { statusCode: 404, error: 'NotFoundException', message: 'Profile not found' },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<HistoryPage />);
    expect(
      await screen.findByRole('button', { name: 'Criar perfil no servidor' }),
    ).toBeInTheDocument();
  });
});
