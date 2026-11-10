import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateProfileSchema } from '@gwent/shared';
import { createZodDto } from 'nestjs-zod';
import { ProfilesService } from './profiles.service';

/** DTO generated from the schema shared with the frontend (same validation on both sides). */
class CreateProfileDto extends createZodDto(CreateProfileSchema) {}

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post()
  create(@Body() body: CreateProfileDto) {
    return this.profiles.create(body.name);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.get(id);
  }

  @Patch(':id')
  rename(@Param('id', ParseUUIDPipe) id: string, @Body() body: CreateProfileDto) {
    return this.profiles.rename(id, body.name);
  }
}
