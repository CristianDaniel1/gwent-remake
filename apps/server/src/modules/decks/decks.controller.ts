import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { SaveDeckSchema } from '@gwent/shared';
import { createZodDto } from 'nestjs-zod';
import { DecksService } from './decks.service';

class SaveDeckDto extends createZodDto(SaveDeckSchema) {}

@Controller('profiles/:profileId/decks')
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  @Get()
  list(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.decks.list(profileId);
  }

  @Post()
  create(@Param('profileId', ParseUUIDPipe) profileId: string, @Body() body: SaveDeckDto) {
    return this.decks.create(profileId, body);
  }

  @Put(':deckId')
  update(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Body() body: SaveDeckDto,
  ) {
    return this.decks.update(profileId, deckId, body);
  }

  @Delete(':deckId')
  @HttpCode(204)
  remove(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('deckId', ParseUUIDPipe) deckId: string,
  ) {
    return this.decks.remove(profileId, deckId);
  }
}
