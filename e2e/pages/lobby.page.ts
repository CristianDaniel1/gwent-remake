import type { Locator, Page } from '@playwright/test';

/** Online lobby: rooms by code, quick match and the list of live matches. */
export class LobbyPage {
  readonly roomCode: Locator;
  readonly searching: Locator;
  readonly quickMatchButton: Locator;
  /** Error of the last request (unknown room, full room…). */
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.roomCode = page.getByLabel('Código da sala');
    this.searching = page.getByText('Procurando um oponente…');
    this.quickMatchButton = page.getByRole('button', { name: 'Partida rápida' });
    this.error = page.getByRole('alert');
  }

  /** Stops searching for an opponent. */
  async cancelSearch() {
    await this.page.getByRole('button', { name: 'Cancelar' }).click();
  }

  /**
   * Opens the lobby with the player's name filled in.
   *
   * @param name - Player name shown to the opponent.
   */
  async open(name: string) {
    await this.page.goto('/online');
    await this.page.getByLabel('Seu nome').fill(name);
  }

  /**
   * Creates a room and waits for its code.
   *
   * @returns The room code to share.
   */
  async createRoom(): Promise<string> {
    await this.page.getByRole('button', { name: 'Criar sala' }).click();
    const code = await this.roomCode.innerText();
    return code.trim();
  }

  /**
   * Enters a friend's room.
   *
   * @param code - Room code.
   */
  async joinRoom(code: string) {
    await this.page.getByLabel('ou entre na sala de um amigo:').fill(code);
    await this.page.getByRole('button', { name: 'Entrar' }).click();
  }

  /** Enters the quick match queue. */
  async quickMatch() {
    await this.quickMatchButton.click();
  }

  /**
   * Watches a live match from the lobby list.
   *
   * @param hostName - Name of the player in the first seat.
   * @param guestName - Name of the player in the second seat.
   */
  async watch(hostName: string, guestName: string) {
    await this.page.getByRole('button', { name: `Assistir ${hostName} × ${guestName}` }).click();
  }
}
