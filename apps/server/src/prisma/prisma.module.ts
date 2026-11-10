import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Global: repositories in any module receive the PrismaService through injection. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
