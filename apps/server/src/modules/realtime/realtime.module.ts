import { Module } from '@nestjs/common';
import { MATCH_RECORDER } from '../matches/match-recorder';
import { MatchesModule } from '../matches/matches.module';
import { MatchesService } from '../matches/matches.service';
import { GameGateway } from './game.gateway';
import { DEFAULT_REALTIME_OPTIONS, REALTIME_OPTIONS } from './realtime.options';
import { RoomsService } from './rooms.service';

@Module({
  imports: [MatchesModule],
  providers: [
    GameGateway,
    RoomsService,
    { provide: REALTIME_OPTIONS, useValue: DEFAULT_REALTIME_OPTIONS },
    { provide: MATCH_RECORDER, useExisting: MatchesService },
  ],
})
export class RealtimeModule {}
