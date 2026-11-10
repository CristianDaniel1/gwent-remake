import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateMatchSchema } from '@gwent/shared';
import { createZodDto } from 'nestjs-zod';
import { MatchesService } from './matches.service';

class CreateMatchDto extends createZodDto(CreateMatchSchema) {}

@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post('profiles/:profileId/matches')
  record(@Param('profileId', ParseUUIDPipe) profileId: string, @Body() body: CreateMatchDto) {
    return this.matches.record(profileId, body);
  }

  @Get('profiles/:profileId/matches')
  history(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.matches.history(profileId);
  }

  @Get('matches/:id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.detail(id);
  }
}
