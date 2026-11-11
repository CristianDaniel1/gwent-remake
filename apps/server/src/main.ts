import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_PREFIX } from './common/constants/app.constants';
import { describeError } from './common/helpers/describe-error';
import { configureApp } from './config/configure-app';
import type { Env } from './config/env';

/** Starts the HTTP and WebSocket server. */
const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API em http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
};

bootstrap().catch((error: unknown) => {
  Logger.error('Could not start the server', describeError(error), 'Bootstrap');
  process.exit(1);
});
