import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Database access for profiles (only the repository knows Prisma). */
@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(name: string) {
    return this.prisma.profile.create({ data: { name } });
  }

  findById(id: string) {
    return this.prisma.profile.findUnique({ where: { id } });
  }

  rename(id: string, name: string) {
    return this.prisma.profile.update({ where: { id }, data: { name } });
  }
}
