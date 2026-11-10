import { Injectable, NotFoundException } from '@nestjs/common';
import type { Profile } from '@gwent/shared';
import { ProfilesRepository } from './profiles.repository';

type ProfileRow = { id: string; name: string; createdAt: Date };

export const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class ProfilesService {
  constructor(private readonly profiles: ProfilesRepository) {}

  async create(name: string): Promise<Profile> {
    return toProfile(await this.profiles.create(name));
  }

  async get(id: string): Promise<Profile> {
    const row = await this.profiles.findById(id);
    if (!row) throw new NotFoundException('Profile not found');
    return toProfile(row);
  }

  async exists(id: string): Promise<boolean> {
    return (await this.profiles.findById(id)) !== null;
  }

  async rename(id: string, name: string): Promise<Profile> {
    await this.get(id);
    return toProfile(await this.profiles.rename(id, name));
  }
}
