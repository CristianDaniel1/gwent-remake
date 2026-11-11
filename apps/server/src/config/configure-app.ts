import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { API_PREFIX } from '../common/constants/app.constants';
import type { Env } from './env';

/**
 * Applies the HTTP settings shared by the server and the e2e tests: route prefix, CORS and
 * graceful shutdown.
 *
 * @param app - Nest application, before it starts listening.
 */
export const configureApp = (app: INestApplication): void => {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }) });
  app.enableShutdownHooks();
};
