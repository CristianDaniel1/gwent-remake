import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfilesService } from './profiles.service';

/** Local player profiles: create, read and rename. */
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  /**
   * Creates a profile.
   *
   * @param body - Player name.
   * @returns The new profile.
   */
  @Post()
  createProfile(@Body() body: CreateProfileDto) {
    return this.profiles.create(body.name);
  }

  /**
   * Reads a profile.
   *
   * @param id - Profile id.
   * @returns The profile.
   * @throws NotFoundException - 404 when the profile does not exist.
   */
  @Get(':id')
  getProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.get(id);
  }

  /**
   * Renames a profile.
   *
   * @param id - Profile id.
   * @param body - New player name.
   * @returns The updated profile.
   * @throws NotFoundException - 404 when the profile does not exist.
   */
  @Patch(':id')
  renameProfile(@Param('id', ParseUUIDPipe) id: string, @Body() body: CreateProfileDto) {
    return this.profiles.rename(id, body.name);
  }
}
