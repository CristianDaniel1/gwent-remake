import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { DecksController } from './decks.controller';
import { DecksRepository } from './decks.repository';
import { DecksService } from './decks.service';

/** Decks saved on the server for each profile. */
@Module({
  imports: [ProfilesModule],
  controllers: [DecksController],
  providers: [DecksService, DecksRepository],
})
export class DecksModule {}
