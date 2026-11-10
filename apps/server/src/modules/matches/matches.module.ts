import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatchReplayer } from './match-replayer';
import { MatchesController } from './matches.controller';
import { MatchesRepository } from './matches.repository';
import { MatchesService } from './matches.service';

@Module({
  imports: [ProfilesModule],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesRepository, MatchReplayer],
  // The multiplayer rooms save finished matches through MatchesService (MatchRecorder).
  exports: [MatchesService],
})
export class MatchesModule {}
