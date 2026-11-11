import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiErrorSchema, DeckRecordSchema, MatchSummarySchema, ProfileSchema } from '@gwent/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  IMPOSSIBLE_DECK,
  MISSING_ID,
  P1_RESULT_BY_WINNER,
  TEST_DECKS,
} from './constants/test.constants';
import { playBotMatch } from './helpers/bot-match';

const databaseUrl = inject('testDatabaseUrl');

describe.skipIf(!databaseUrl)('API (e2e, gwent_test database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl ?? '';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "Match", "Deck", "Profile" CASCADE`;
  });

  const createProfile = async (name = 'Ciri') => {
    const response = await http().post('/api/profiles').send({ name }).expect(201);
    return ProfileSchema.parse(response.body);
  };

  const createDeck = async (profileId: string) => {
    const response = await http()
      .post(`/api/profiles/${profileId}/decks`)
      .send({ name: 'Norte', deck: TEST_DECKS.p1 })
      .expect(201);
    return DeckRecordSchema.parse(response.body);
  };

  /**
   * Reads an error response in the API format.
   *
   * @param body - Response body.
   * @returns The parsed error.
   */
  const toError = (body: unknown) => ApiErrorSchema.parse(body);

  it('reports healthy when the database is up', async () => {
    await http().get('/api/health').expect(200, { status: 'ok', database: 'ok' });
  });

  describe('profiles', () => {
    it('creates and reads a profile', async () => {
      const profile = await createProfile();
      const response = await http().get(`/api/profiles/${profile.id}`).expect(200);
      expect(response.body).toEqual(profile);
    });

    it('renames a profile', async () => {
      const profile = await createProfile();
      const response = await http()
        .patch(`/api/profiles/${profile.id}`)
        .send({ name: 'Yennefer' })
        .expect(200);
      expect(response.body).toMatchObject({ id: profile.id, name: 'Yennefer' });
    });

    it('answers invalid data with VALIDATION_ERROR', async () => {
      const response = await http().post('/api/profiles').send({ name: '' }).expect(400);
      expect(toError(response.body)).toMatchObject({ error: 'VALIDATION_ERROR' });
    });

    it('answers an invalid id with BAD_REQUEST', async () => {
      const response = await http().get('/api/profiles/not-a-uuid').expect(400);
      expect(toError(response.body)).toMatchObject({ error: 'BAD_REQUEST' });
    });

    it('answers a missing profile with NOT_FOUND', async () => {
      const response = await http().get(`/api/profiles/${MISSING_ID}`).expect(404);
      expect(toError(response.body)).toEqual({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Profile not found',
      });
      await http().patch(`/api/profiles/${MISSING_ID}`).send({ name: 'Yennefer' }).expect(404);
    });
  });

  describe('decks', () => {
    it('creates, updates, lists and deletes a deck', async () => {
      const { id } = await createProfile();
      const created = await createDeck(id);
      await http()
        .put(`/api/profiles/${id}/decks/${created.id}`)
        .send({ name: 'Norte 2', deck: TEST_DECKS.p1 })
        .expect(200);
      const list = await http().get(`/api/profiles/${id}/decks`).expect(200);
      expect(list.body).toEqual([
        expect.objectContaining({ name: 'Norte 2', deck: TEST_DECKS.p1 }),
      ]);
      await http().delete(`/api/profiles/${id}/decks/${created.id}`).expect(204);
      await http().get(`/api/profiles/${id}/decks`).expect(200, []);
    });

    it('rejects an impossible deck with UNPROCESSABLE_ENTITY and the issues', async () => {
      const { id } = await createProfile();
      const response = await http()
        .post(`/api/profiles/${id}/decks`)
        .send({ name: 'Ruim', deck: IMPOSSIBLE_DECK })
        .expect(422);
      expect(toError(response.body)).toMatchObject({
        error: 'UNPROCESSABLE_ENTITY',
        details: expect.any(Array),
      });
    });

    it("does not let a profile update or delete another profile's deck", async () => {
      const owner = await createProfile('Ciri');
      const intruder = await createProfile('Yennefer');
      const deck = await createDeck(owner.id);
      await http()
        .put(`/api/profiles/${intruder.id}/decks/${deck.id}`)
        .send({ name: 'Roubado', deck: TEST_DECKS.p1 })
        .expect(404);
      await http().delete(`/api/profiles/${intruder.id}/decks/${deck.id}`).expect(404);
      const list = await http().get(`/api/profiles/${owner.id}/decks`).expect(200);
      expect(list.body).toEqual([expect.objectContaining({ name: 'Norte' })]);
    });

    it('answers the decks of a missing profile with NOT_FOUND', async () => {
      await http().get(`/api/profiles/${MISSING_ID}/decks`).expect(404);
    });
  });

  describe('matches', () => {
    it('records a match by replaying it on the server and lists it in the history', async () => {
      const { id } = await createProfile();
      const { seed, decks, actions, winner } = playBotMatch(77);

      const saved = await http()
        .post(`/api/profiles/${id}/matches`)
        .send({ seed, decks, actions })
        .expect(201);
      expect(MatchSummarySchema.parse(saved.body)).toMatchObject({
        result: P1_RESULT_BY_WINNER[winner],
        mode: 'bot',
        side: 'p1',
        opponentName: null,
      });

      const history = await http().get(`/api/profiles/${id}/matches`).expect(200);
      expect(history.body).toEqual([saved.body]);
      const detail = await http().get(`/api/matches/${saved.body.id}`).expect(200);
      expect(detail.body).toMatchObject({ seed, decks, actions });
    });

    it('rejects a tampered match with UNPROCESSABLE_ENTITY', async () => {
      const { id } = await createProfile();
      const { seed, decks, actions } = playBotMatch(77);
      const response = await http()
        .post(`/api/profiles/${id}/matches`)
        .send({ seed, decks, actions: actions.slice(0, -2) })
        .expect(422);
      expect(toError(response.body)).toMatchObject({ error: 'UNPROCESSABLE_ENTITY' });
    });

    it('answers a missing profile or match with NOT_FOUND', async () => {
      await http().get(`/api/profiles/${MISSING_ID}/matches`).expect(404);
      await http().get(`/api/matches/${MISSING_ID}`).expect(404);
    });
  });
});
