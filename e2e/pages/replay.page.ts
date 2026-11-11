import type { Locator, Page } from '@playwright/test';

/** Replay viewer: move counter, playback controls and the final result. */
export class ReplayPage {
  readonly moveCounter: Locator;
  readonly finalResult: Locator;
  readonly rules: Locator;

  constructor(readonly page: Page) {
    this.moveCounter = page.getByText(/^Jogada \d+\/\d+$/);
    this.finalResult = page.getByText(/Vitória de|Empate/);
    this.rules = page.getByRole('list', { name: 'Regras desta partida' }).getByRole('listitem');
  }

  /**
   * Clicks one of the playback controls.
   *
   * @param control - Accessible name of the control.
   */
  async press(control: 'Próxima jogada' | 'Reproduzir' | 'Pausar' | 'Fim' | 'Sair do replay') {
    await this.page.getByRole('button', { name: control }).click();
  }
}
