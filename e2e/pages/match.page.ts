import { expect, type Locator, type Page } from '@playwright/test';
import { DEFAULT_SEED, MATCH_DEADLINE_MS, TURN_TIMEOUT_MS } from '../constants/e2e.constants';

/** Time a single click of the automatic player may take before the board changed under it. */
const STEP_TIMEOUT_MS = 5000;

/**
 * Tells whether an error means the board changed while the automatic player acted on it.
 *
 * @param error - Error thrown by a Playwright action.
 * @returns True for a timeout, which the automatic player retries.
 */
const isTimeout = (error: unknown) => error instanceof Error && error.name === 'TimeoutError';

/** Match screen (against the bot or online): the board, the hand and the end screen. */
export class MatchPage {
  readonly hand: Locator;
  readonly handCards: Locator;
  readonly passButton: Locator;
  readonly finishRedrawButton: Locator;
  readonly playButton: Locator;
  readonly targets: Locator;
  /** What shows up once a card is selected: the play button or its targets. */
  readonly selectionActions: Locator;
  /** Enlarged card on the side panel, shown for the focused or selected card. */
  readonly cardPreview: Locator;
  readonly endScreen: Locator;
  readonly turnNotice: Locator;
  readonly rules: Locator;

  constructor(readonly page: Page) {
    this.hand = page.getByRole('region', { name: /na mão$/ });
    this.handCards = this.hand.getByRole('button');
    this.passButton = page.getByRole('button', { name: 'Passar', exact: true });
    this.finishRedrawButton = page.getByRole('button', { name: 'Terminar troca' });
    this.playButton = page.getByRole('button', { name: 'Jogar', exact: true });
    this.targets = page.locator('[data-target]');
    this.selectionActions = this.playButton.or(this.targets).first();
    this.cardPreview = page.getByRole('complementary').getByRole('img');
    this.endScreen = page.getByRole('dialog', { name: /Vitória|Derrota|Empate/ });
    this.turnNotice = page.getByRole('status');
    this.rules = page.getByRole('list', { name: 'Regras desta partida' }).getByRole('listitem');
  }

  /** Dialogs that ask the player something (not the end screen). */
  private get openDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ hasNot: this.page.getByRole('button', { name: /^(Revanche|Jogar de novo)$/ }) });
  }

  /**
   * Opens a match against the bot.
   *
   * @param seed - Match seed, so the deal is always the same.
   */
  async open(seed: number = DEFAULT_SEED) {
    await this.page.goto(`/game?seed=${seed}`);
  }

  /** Ends the initial redraw without changing any card. */
  async finishRedraw() {
    await this.finishRedrawButton.click();
  }

  /** Waits until it is the player's turn and no dialog or notice is on screen. */
  async waitForMyTurn() {
    await expect(this.passButton).toBeEnabled({ timeout: TURN_TIMEOUT_MS });
    await expect(this.page.getByRole('dialog')).toHaveCount(0);
    await expect(this.turnNotice).toHaveCount(0, { timeout: TURN_TIMEOUT_MS });
  }

  /**
   * Reads the number of cards in the player's hand.
   *
   * @returns The count shown in the hand's accessible name.
   */
  async handSize(): Promise<number> {
    const label = await this.hand.getAttribute('aria-label');
    return Number(label?.match(/\d+/)?.[0]);
  }

  /** Plays the first card of the hand, on the first valid target when it needs one. */
  async playFirstCard() {
    await this.handCards.first().click({ timeout: STEP_TIMEOUT_MS });
    try {
      await this.selectionActions.waitFor({ timeout: STEP_TIMEOUT_MS });
    } catch (error) {
      if (!isTimeout(error)) throw error;
    }
    if (await this.playButton.count()) {
      await this.playButton.click({ timeout: STEP_TIMEOUT_MS });
      return;
    }
    if (await this.targets.count()) {
      await this.targets.first().click({ timeout: STEP_TIMEOUT_MS });
      return;
    }
    await this.page.keyboard.press('Escape');
  }

  /** Leaves the match through the exit button and confirms. */
  async leave() {
    await this.openExitDialog();
    await this.exitDialog.getByRole('button', { name: 'Sair', exact: true }).click();
  }

  /** Dialog that asks whether to leave the match. */
  get exitDialog() {
    return this.page.getByRole('dialog', { name: 'Sair da partida' });
  }

  /** Opens the exit confirmation without answering it. */
  async openExitDialog() {
    await this.page.getByRole('button', { name: 'Sair da partida' }).click();
  }

  /**
   * Plays until the end screen shows: answers every dialog, plays the first card of the hand and
   * passes when the hand is empty.
   *
   * @throws Error - When the match does not end within MATCH_DEADLINE_MS (with the page snapshot).
   */
  async playWholeMatch() {
    const deadline = Date.now() + MATCH_DEADLINE_MS;
    while (!(await this.endScreen.isVisible())) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        const snapshot = await this.page.locator('body').ariaSnapshot();
        throw new Error(`The match did not end in time:\n${snapshot}`);
      }
      await this.waitForSomethingToDo(remainingMs);
      try {
        await this.takeNextStep();
      } catch (error) {
        if (!isTimeout(error)) throw error;
      }
    }
  }

  private async isPassEnabled() {
    return (await this.passButton.count()) > 0 && (await this.passButton.isEnabled());
  }

  /**
   * Waits until the match ends, a dialog asks something or it is the player's turn.
   *
   * @param timeoutMs - Longest wait (the bot may think for long while the machine is busy).
   */
  private async waitForSomethingToDo(timeoutMs: number) {
    await expect
      .poll(
        async () =>
          (await this.endScreen.count()) > 0 ||
          (await this.openDialog.count()) > 0 ||
          (await this.isPassEnabled()),
        { timeout: timeoutMs },
      )
      .toBe(true);
  }

  private async takeNextStep() {
    if (await this.endScreen.count()) return;
    if (await this.openDialog.count()) {
      await this.answerDialog(this.openDialog);
      return;
    }
    if (!(await this.handCards.count())) {
      await this.passButton.click({ timeout: STEP_TIMEOUT_MS });
      return;
    }
    await this.playFirstCard();
  }

  /**
   * Answers a dialog: confirms it when possible, otherwise picks an option or closes it.
   *
   * @param dialog - Dialog on screen.
   */
  private async answerDialog(dialog: Locator) {
    const finish = dialog.getByRole('button', { name: /Terminar troca|Confirmar/ });
    const pick = dialog.getByRole('button', { name: /^Escolher: / });
    const close = dialog.getByRole('button', { name: 'Fechar', exact: true });
    if ((await finish.count()) && (await finish.isEnabled())) {
      await finish.click({ timeout: STEP_TIMEOUT_MS });
      return;
    }
    if (await pick.count()) {
      await pick.click({ timeout: STEP_TIMEOUT_MS });
      if (await finish.count()) await this.moveCarousel(dialog);
      return;
    }
    if (await close.count()) {
      await close.click({ timeout: STEP_TIMEOUT_MS });
      return;
    }
    await dialog.getByRole('button').first().click({ timeout: STEP_TIMEOUT_MS });
  }

  /**
   * Moves a card carousel to another card, so the next pick chooses a different one.
   *
   * @param dialog - Dialog with the carousel.
   */
  private async moveCarousel(dialog: Locator) {
    const next = dialog.getByRole('button', { name: 'Próxima carta' });
    if (await next.isEnabled()) {
      await next.click({ timeout: STEP_TIMEOUT_MS });
      return;
    }
    await dialog
      .getByRole('button', { name: 'Carta anterior' })
      .click({ timeout: STEP_TIMEOUT_MS });
  }
}
