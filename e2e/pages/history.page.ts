import type { Locator, Page } from '@playwright/test';
import type { UploadFile } from '../helpers/files';

/** Match history: the server list and opening a replay file. */
export class HistoryPage {
  readonly title: Locator;
  readonly fileError: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByRole('heading', { name: 'Histórico de partidas' });
    this.fileError = page
      .getByRole('alert')
      .filter({ hasText: 'Esse arquivo não é um replay válido.' });
  }

  async open() {
    await this.page.goto('/history');
  }

  /**
   * Opens a replay file through the file picker.
   *
   * @param file - Path of the file, or its name and content.
   */
  async openReplayFile(file: UploadFile) {
    await this.page.getByLabel('Abrir arquivo de replay', { exact: true }).setInputFiles(file);
  }
}
