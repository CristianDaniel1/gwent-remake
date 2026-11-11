import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchesService } from './matches.service';

/** Match history: record matches against the bot, list a profile's history and read a match. */
@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  /**
   * Records a finished match against the bot; the server replays it to get the result.
   *
   * @param profileId - Profile that played.
   * @param body - Seed, decks, mutators and actions of the match.
   * @returns The saved match summary.
   * @throws NotFoundException - 404 when the profile does not exist.
   * @throws UnprocessableEntityException - 422 when the match cannot be replayed or did not finish.
   */
  @Post('profiles/:profileId/matches')
  recordMatch(@Param('profileId', ParseUUIDPipe) profileId: string, @Body() body: CreateMatchDto) {
    return this.matches.record(profileId, body);
  }

  /**
   * Lists the latest matches of a profile.
   *
   * @param profileId - Profile id.
   * @returns The match summaries, newest first.
   * @throws NotFoundException - 404 when the profile does not exist.
   */
  @Get('profiles/:profileId/matches')
  listHistory(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.matches.history(profileId);
  }

  /**
   * Reads a full match, to watch its replay.
   *
   * @param id - Match id.
   * @returns The match with seed, decks and actions.
   * @throws NotFoundException - 404 when the match does not exist.
   */
  @Get('matches/:id')
  getMatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.detail(id);
  }
}
