import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const apiServer = setupServer(
  http.get('*/api/health', () => HttpResponse.json({ statusCode: 503 }, { status: 503 })),
);

export { http, HttpResponse };
