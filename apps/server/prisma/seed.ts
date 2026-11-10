// Sample data: a "Demo" profile with the premade decks.
//   pnpm --filter @gwent/server db:seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PREMADE_DECKS } from '@gwent/engine';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
});

async function main() {
  const existing = await prisma.profile.findFirst({ where: { name: 'Demo' } });
  if (existing) {
    console.log(`Demo profile already exists (${existing.id}).`);
    return;
  }
  const profile = await prisma.profile.create({
    data: {
      name: 'Demo',
      decks: {
        create: PREMADE_DECKS.map((deck, i) => ({
          name: `Pronto ${i + 1}`,
          faction: deck.faction,
          leader: deck.leader,
          cards: deck.cards.map(([id, count]) => [id, count]),
        })),
      },
    },
  });
  console.log(`Demo profile created (${profile.id}) with ${PREMADE_DECKS.length} decks.`);
}

main().finally(() => prisma.$disconnect());
