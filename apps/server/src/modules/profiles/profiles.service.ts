import { Injectable, NotFoundException } from '@nestjs/common';
import type { Profile } from '@gwent/shared';
import { toProfile } from './helpers/profile.mappers';
import { ProfilesRepository } from './profiles.repository';

/** Local player profiles (no login): create, read and rename. */
@Injectable()
export class ProfilesService {
  constructor(private readonly profiles: ProfilesRepository) {}

  /**
   * Creates a profile.
   *
   * @param name - Player name.
   * @returns The new profile.
   */
  async create(name: string): Promise<Profile> {
    const row = await this.profiles.create(name);
    return toProfile(row);
  }

  /**
   * Reads a profile.
   *
   * @param id - Profile id.
   * @returns The profile.
   * @throws NotFoundException - When the profile does not exist.
   */
  async get(id: string): Promise<Profile> {
    const row = await this.profiles.findById(id);
    if (!row) throw new NotFoundException('Profile not found');
    return toProfile(row);
  }

  /**
   * Tells whether a profile exists.
   *
   * @param id - Profile id.
   * @returns True when the profile exists.
   */
  async exists(id: string): Promise<boolean> {
    const row = await this.profiles.findById(id);
    return !!row;
  }

  /**
   * Fails when a profile does not exist.
   *
   * @param id - Profile id.
   * @throws NotFoundException - When the profile does not exist.
   */
  async ensureExists(id: string): Promise<void> {
    const profileExists = await this.exists(id);
    if (!profileExists) throw new NotFoundException('Profile not found');
  }

  /**
   * Changes the name of a profile.
   *
   * @param id - Profile id.
   * @param name - New player name.
   * @returns The updated profile.
   * @throws NotFoundException - When the profile does not exist.
   */
  async rename(id: string, name: string): Promise<Profile> {
    await this.ensureExists(id);
    const row = await this.profiles.rename(id, name);
    return toProfile(row);
  }
}
