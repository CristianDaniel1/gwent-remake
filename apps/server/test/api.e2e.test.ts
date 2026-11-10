import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  applyAction,
  chooseAiAction,
  createGame,
  PREMADE_DECKS,
  randomFrom,
  type DeckList,
  type GameAction,
} from '@gwent/engine';
import { ApiErrorSchema, MatchSummarySchema, ProfileSchema } from '@gwent/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = inject('testDatabaseUrl');

describe.skipIf(!databaseUrl)('API (e2e, banco gwent_test)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl as string;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Match", "Deck", "Profile" CASCADE');
  });

  const createProfile = async () =>
    ProfileSchema.parse(
      (await http().post('/api/profiles').send({ name: 'Ciri' }).expect(201)).body,
    );

  it('reports healthy when the database is up', async () => {
    await http().get('/api/health').expect(200, { status: 'ok', database: 'ok' });
  });

  it('creates a profile and returns a standard error for invalid data', async () => {
    const profile = await createProfile();
    await http().get(`/api/profiles/${profile.id}`).expect(200);
    const error = await http().post('/api/profiles').send({ name: '' }).expect(400);
    expect(ApiErrorSchema.parse(error.body)).toMatchObject({ error: 'ValidationError' });
    await http().get('/api/profiles/00000000-0000-4000-8000-000000000000').expect(404);
  });

  it("supports CRUD for the profile's decks", async () => {
    const { id } = await createProfile();
    const deck = PREMADE_DECKS[0] as DeckList;
    const created = await http()
      .post(`/api/profiles/${id}/decks`)
      .send({ name: 'Norte', deck })
      .expect(201);
    await http()
      .put(`/api/profiles/${id}/decks/${created.body.id}`)
      .send({ name: 'Norte 2', deck })
      .expect(200);
    const list = await http().get(`/api/profiles/${id}/decks`).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ name: 'Norte 2', deck });
    await http().delete(`/api/profiles/${id}/decks/${created.body.id}`).expect(204);
    await http().get(`/api/profiles/${id}/decks`).expect(200, []);
  });

  it('records a match by replaying it on the server and lists it in the history', async () => {
    const { id } = await createProfile();
    const decks = { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[6] as DeckList };
    let { state } = createGame({ seed: 77, decks });
    const actions: GameAction[] = [];
    const rng = randomFrom({ state: 77 });
    while (state.phase !== 'gameOver') {
      const action = (chooseAiAction(state, 'p1', rng) ?? chooseAiAction(state, 'p2', rng))!;
      actions.push(action);
      const result = applyAction(state, action);
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
    }

    const saved = await http()
      .post(`/api/profiles/${id}/matches`)
      .send({ seed: 77, decks, actions })
      .expect(201);
    const expected = state.result === 'draw' ? 'draw' : state.result === 'p1' ? 'win' : 'loss';
    expect(MatchSummarySchema.parse(saved.body)).toMatchObject({
      result: expected,
      mode: 'bot',
      side: 'p1',
      opponentName: null,
    });

    const history = await http().get(`/api/profiles/${id}/matches`).expect(200);
    expect(history.body).toHaveLength(1);
    const detail = await http().get(`/api/matches/${saved.body.id}`).expect(200);
    expect(detail.body).toMatchObject({ seed: 77, actions });

    // The client cannot record a tampered match
    await http()
      .post(`/api/profiles/${id}/matches`)
      .send({ seed: 77, decks, actions: actions.slice(0, -2) })
      .expect(422);
  });
});
