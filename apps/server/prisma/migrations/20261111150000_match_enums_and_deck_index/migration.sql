-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('bot', 'online');

-- CreateEnum
CREATE TYPE "PlayerSide" AS ENUM ('p1', 'p2');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('win', 'loss', 'draw');

-- AlterTable: convert the existing values instead of dropping the columns
ALTER TABLE "Match" ALTER COLUMN "mode" DROP DEFAULT,
ALTER COLUMN "mode" TYPE "MatchMode" USING "mode"::"MatchMode",
ALTER COLUMN "mode" SET DEFAULT 'bot',
ALTER COLUMN "side" DROP DEFAULT,
ALTER COLUMN "side" TYPE "PlayerSide" USING "side"::"PlayerSide",
ALTER COLUMN "side" SET DEFAULT 'p1',
ALTER COLUMN "result" TYPE "MatchResult" USING "result"::"MatchResult";

-- DropIndex
DROP INDEX "Deck_profileId_idx";

-- CreateIndex
CREATE INDEX "Deck_profileId_updatedAt_idx" ON "Deck"("profileId", "updatedAt");
