import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesRepository } from './profiles.repository';
import { ProfilesService } from './profiles.service';

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService, ProfilesRepository],
  // Decks and matches need to check whether the profile exists.
  exports: [ProfilesService],
})
export class ProfilesModule {}
