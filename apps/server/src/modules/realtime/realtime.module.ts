import { Module } from '@nestjs/common';
import { MATCH_RECORDER } from '../matches/constants/matches.constants';
import { MatchesModule } from '../matches/matches.module';
import { MatchesService } from '../matches/matches.service';
import { DEFAULT_REALTIME_OPTIONS, REALTIME_OPTIONS } from './constants/realtime.constants';
import { GameGateway } from './game.gateway';
import { RoomsService } from './rooms.service';

/** Multiplayer rooms over Socket.IO; saves finished matches through the match history. */
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
