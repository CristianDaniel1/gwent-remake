import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Database access for profiles. */
@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserts a profile.
   *
   * @param name - Player name.
   * @returns The created row.
   */
  create(name: string) {
    return this.prisma.profile.create({ data: { name } });
  }

  findById(id: string) {
    return this.prisma.profile.findUnique({ where: { id } });
  }

  /**
   * Changes the name of a profile.
   *
   * @param id - Profile id.
   * @param name - New player name.
   * @returns The updated row.
   */
  rename(id: string, name: string) {
    return this.prisma.profile.update({ where: { id }, data: { name } });
  }
}
