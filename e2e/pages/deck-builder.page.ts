import type { Download, Locator, Page } from '@playwright/test';
import type { UploadFile } from '../helpers/files';

/** Deck builder: faction, collection, deck totals, deck files and the match options. */
export class DeckBuilderPage {
  readonly totalCards: Locator;
  readonly startGameButton: Locator;
  /** Message about the last deck file (imported, or why it could not be read). */
  readonly fileMessage: Locator;
  readonly matchOptionsSummary: Locator;

  constructor(readonly page: Page) {
    this.totalCards = page.locator('dt', { hasText: 'Total de cartas no baralho' }).locator('+ dd');
    this.startGameButton = page.getByRole('button', { name: 'Iniciar jogo' });
    this.fileMessage = page.getByRole('status');
    this.matchOptionsSummary = page.getByText(/^(Fácil|Normal|Difícil) · \d+ mutador(es)?$/);
  }

  async open() {
    await this.page.goto('/deck-builder');
  }

  /**
   * Uploads a file as the player's deck.
   *
   * @param file - Path of the file, or its name and content.
   */
  async uploadDeck(file: UploadFile) {
    await this.page.getByLabel('Enviar Baralho', { exact: true }).setInputFiles(file);
  }

  /**
   * Downloads the current deck.
   *
   * @returns The download of the deck file.
   */
  async downloadDeck(): Promise<Download> {
    const download = this.page.waitForEvent('download');
    await this.page.getByRole('button', { name: 'Baixar Baralho' }).click();
    return download;
  }

  /**
   * Chooses the bot difficulty and the mutators in the match options dialog.
   *
   * @param difficulty - Difficulty name as shown on screen.
   * @param mutators - Names of the mutators to turn on, as shown on screen.
   */
  async chooseMatchOptions(difficulty: string, mutators: string[]) {
    await this.page.getByRole('button', { name: 'Opções da partida' }).click();
    const dialog = this.page.getByRole('dialog', { name: 'Opções da partida' });
    await dialog.getByRole('radio', { name: difficulty }).click();
    for (const mutator of mutators) await dialog.getByRole('checkbox', { name: mutator }).check();
    await dialog.getByRole('button', { name: 'Fechar' }).click();
  }

  /**
   * Switches the deck to another faction.
   *
   * @param faction - Faction name as shown on screen.
   */
  async changeFaction(faction: string) {
    await this.page.getByRole('button', { name: 'Trocar Facção' }).click();
    await this.page.getByRole('dialog').getByRole('button', { name: faction }).click();
  }

  /** Adds the first card of the collection to the deck. */
  async addFirstCollectionCard() {
    await this.page
      .getByRole('region', { name: 'Coleção de Cartas' })
      .getByRole('button', { name: /^Adicionar / })
      .first()
      .click();
  }

  /**
   * Reads the number of cards in the deck.
   *
   * @returns The total shown in the deck summary.
   */
  async totalCardCount(): Promise<number> {
    const total = await this.totalCards.innerText();
    return Number(total);
  }

  /**
   * Creates a server profile from the server decks dialog.
   *
   * @param name - Profile name.
   */
  async createServerProfile(name: string) {
    await this.page.getByRole('button', { name: 'Baralhos no servidor' }).click();
    await this.page.getByLabel('Seu nome').fill(name);
    await this.page.getByRole('button', { name: 'Criar perfil no servidor' }).click();
  }

  /** Saves the current deck on the server (the server decks dialog must be open). */
  async saveCurrentDeckOnServer() {
    await this.page.getByRole('button', { name: 'Salvar baralho atual' }).click();
  }
}
