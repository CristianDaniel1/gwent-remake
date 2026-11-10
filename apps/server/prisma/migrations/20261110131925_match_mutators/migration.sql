-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "mutators" JSONB NOT NULL DEFAULT '[]';
