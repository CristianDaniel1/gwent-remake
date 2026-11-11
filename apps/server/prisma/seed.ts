// Sample data: a "Demo" profile with the premade decks.
//   pnpm --filter @gwent/server db:seed
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PREMADE_DECKS } from '@gwent/engine';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

/** Creates the Demo profile with the premade decks, unless it already exists. */
const main = async () => {
  const existing = await prisma.profile.findFirst({ where: { name: 'Demo' } });
  if (existing) {
    console.log(`Demo profile already exists (${existing.id}).`);
    return;
  }
  const profile = await prisma.profile.create({
    data: {
      name: 'Demo',
      decks: {
        create: PREMADE_DECKS.map((deck, index) => ({
          name: `Pronto ${index + 1}`,
          faction: deck.faction,
          leader: deck.leader,
          cards: deck.cards.map(([id, count]) => [id, count]),
        })),
      },
    },
  });
  console.log(`Demo profile created (${profile.id}) with ${PREMADE_DECKS.length} decks.`);
};

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
