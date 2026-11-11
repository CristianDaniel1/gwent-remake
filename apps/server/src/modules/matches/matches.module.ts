import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatchReplayer } from './match-replayer';
import { MatchesController } from './matches.controller';
import { MatchesRepository } from './matches.repository';
import { MatchesService } from './matches.service';

/** Match history; exports the service so the multiplayer rooms can save finished matches. */
@Module({
  imports: [ProfilesModule],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesRepository, MatchReplayer],
  exports: [MatchesService],
})
export class MatchesModule {}
