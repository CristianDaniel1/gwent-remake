import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { DecksService } from './decks.service';
import { SaveDeckDto } from './dto/save-deck.dto';

/** Decks of a profile: list, create, update and delete. */
@Controller('profiles/:profileId/decks')
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  /**
   * Lists the decks of a profile.
   *
   * @param profileId - Owner profile id.
   * @returns The decks, most recently changed first.
   * @throws NotFoundException - 404 when the profile does not exist.
   */
  @Get()
  listDecks(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.decks.list(profileId);
  }

  /**
   * Saves a new deck.
   *
   * @param profileId - Owner profile id.
   * @param body - Deck name and card list.
   * @returns The saved deck.
   * @throws NotFoundException - 404 when the profile does not exist.
   * @throws UnprocessableEntityException - 422 when the deck breaks the building rules.
   */
  @Post()
  createDeck(@Param('profileId', ParseUUIDPipe) profileId: string, @Body() body: SaveDeckDto) {
    return this.decks.create(profileId, body);
  }

  /**
   * Replaces a deck of the profile.
   *
   * @param profileId - Owner profile id.
   * @param deckId - Deck id.
   * @param body - New name and card list.
   * @returns The saved deck.
   * @throws NotFoundException - 404 when the deck does not exist or belongs to another profile.
   * @throws UnprocessableEntityException - 422 when the deck breaks the building rules.
   */
  @Put(':deckId')
  updateDeck(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Body() body: SaveDeckDto,
  ) {
    return this.decks.update(profileId, deckId, body);
  }

  /**
   * Deletes a deck of the profile.
   *
   * @param profileId - Owner profile id.
   * @param deckId - Deck id.
   * @throws NotFoundException - 404 when the deck does not exist or belongs to another profile.
   */
  @Delete(':deckId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDeck(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('deckId', ParseUUIDPipe) deckId: string,
  ) {
    return this.decks.remove(profileId, deckId);
  }
}
