import { SERVER_TAG, SLOW_TAG } from '../constants/e2e.constants';
import { expect, test, type Player } from '../fixtures/test';

/**
 * Starts a match in a room by code between two players.
 *
 * @param host - Player who creates the room.
 * @param guest - Player who enters with the code.
 * @returns The room code.
 */
const startCodeRoom = async (host: Player, guest: Player) => {
  const code = await host.lobby.createRoom();
  await guest.lobby.joinRoom(code);
  await expect(host.page).toHaveURL(/\/online\/game/);
  await expect(guest.page).toHaveURL(/\/online\/game/);
  return code;
};

test.describe('Multiplayer', { tag: SERVER_TAG }, () => {
  test(
    'two players finish a match in a code room and start a rematch',
    { tag: SLOW_TAG },
    async ({ openPlayer }) => {
      const host = await openPlayer('Geralt');
      const guest = await openPlayer('Ciri');
      const code = await startCodeRoom(host, guest);
      expect(code).toMatch(/^[A-Z0-9]{5}$/);
      await expect(host.page.getByRole('region', { name: guest.name })).toBeVisible();
      await expect(guest.page.getByRole('region', { name: host.name })).toBeVisible();

      await Promise.all([host.match.playWholeMatch(), guest.match.playWholeMatch()]);

      await host.page.getByRole('button', { name: 'Revanche' }).click();
      await expect(guest.page.getByText(`${host.name} quer revanche!`)).toBeVisible();
      await guest.page.getByRole('button', { name: 'Revanche' }).click();
      await expect(host.match.finishRedrawButton).toBeVisible();
      await expect(guest.match.finishRedrawButton).toBeVisible();
    },
  );

  test.describe('quick match', () => {
    // The queue is shared by the whole server: these tests run one after the other, so a player
    // of one test is never paired with a player of the other.
    test.describe.configure({ mode: 'default' });

    test('closes the room and tells the opponent when a player leaves', async ({ openPlayer }) => {
      const first = await openPlayer('Yennefer');
      const second = await openPlayer('Triss');
      await first.lobby.quickMatch();
      await expect(first.lobby.searching).toBeVisible();
      await second.lobby.quickMatch();
      await expect(first.page).toHaveURL(/\/online\/game/);
      await expect(second.page).toHaveURL(/\/online\/game/);

      await second.match.leave();
      await expect(
        first.page.getByRole('dialog', { name: 'O oponente saiu da partida.' }),
      ).toBeVisible();
    });

    test('leaves the queue when the search is cancelled', async ({ openPlayer }) => {
      const first = await openPlayer('Keira');
      await first.lobby.quickMatch();
      await expect(first.lobby.searching).toBeVisible();
      await first.lobby.cancelSearch();
      await expect(first.lobby.searching).toBeHidden();
      await expect(first.lobby.quickMatchButton).toBeVisible();

      const second = await openPlayer('Shani');
      await second.lobby.quickMatch();
      await expect(second.lobby.searching).toBeVisible();
      await expect(first.page).toHaveURL(/\/online$/);
      await second.lobby.cancelSearch();
    });
  });

  test('shows an error for a room code that does not exist', async ({ openPlayer }) => {
    const player = await openPlayer('Milva');
    await player.lobby.joinRoom('ZZZZZ');
    await expect(player.lobby.error).toHaveText('Sala não encontrada.');
    await expect(player.page).toHaveURL(/\/online$/);
  });

  test('shows an error when the room is already full', async ({ openPlayer }) => {
    const host = await openPlayer('Regis');
    const guest = await openPlayer('Cahir');
    const code = await startCodeRoom(host, guest);

    const latecomer = await openPlayer('Angoulême');
    await latecomer.lobby.joinRoom(code);
    await expect(latecomer.lobby.error).toHaveText('Essa sala já está cheia.');
  });

  test('returns to the same match after reloading the page', async ({ openPlayer }) => {
    const host = await openPlayer('Dandelion');
    const guest = await openPlayer('Zoltan');
    await startCodeRoom(host, guest);

    await guest.page.reload();
    await expect(guest.page).toHaveURL(/\/online\/game/);
    await expect(guest.page.getByRole('region', { name: host.name })).toBeVisible();
    await expect(guest.match.finishRedrawButton).toBeVisible();
  });

  test('lets a spectator watch a live match without seeing any hand', async ({ openPlayer }) => {
    const host = await openPlayer('Eskel');
    const guest = await openPlayer('Lambert');
    await startCodeRoom(host, guest);

    const watcher = await openPlayer('Vesemir');
    await watcher.lobby.watch(host.name, guest.name);
    await expect(watcher.page).toHaveURL(/\/online\/watch/);
    await expect(watcher.page.getByRole('region', { name: host.name })).toBeVisible();
    await expect(watcher.page.getByText('Ao vivo')).toBeVisible();
    await expect(watcher.match.handCards).toHaveCount(0);
    await expect(host.page.getByText('1 assistindo')).toBeVisible();

    await host.match.finishRedraw();
    await guest.match.finishRedraw();
    await expect(watcher.page.getByRole('region', { name: host.name })).toBeVisible();

    await watcher.page.getByRole('button', { name: 'Parar de assistir' }).click();
    await expect(watcher.page).toHaveURL(/\/online$/);
    await expect(host.page.getByText('1 assistindo')).toBeHidden();
  });
});
