import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/** Mocked API in tests. Default: server down (the game works without it). */
export const apiServer = setupServer(
  http.get('*/api/health', () => HttpResponse.json({ statusCode: 503 }, { status: 503 })),
);

export { http, HttpResponse };
