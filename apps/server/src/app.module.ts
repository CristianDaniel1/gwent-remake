import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnv } from './config/env';
import { DecksModule } from './modules/decks/decks.module';
import { HealthController } from './modules/health/health.controller';
import { MatchesModule } from './modules/matches/matches.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    ProfilesModule,
    DecksModule,
    MatchesModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [
    // Validation of every DTO (Zod schemas from @gwent/shared) and a single error format.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
