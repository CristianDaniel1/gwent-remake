-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "faction" VARCHAR(20) NOT NULL,
    "leader" INTEGER NOT NULL,
    "cards" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "seed" BIGINT NOT NULL,
    "faction" VARCHAR(20) NOT NULL,
    "opponent" VARCHAR(20) NOT NULL,
    "result" VARCHAR(10) NOT NULL,
    "rounds" JSONB NOT NULL,
    "decks" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deck_profileId_idx" ON "Deck"("profileId");

-- CreateIndex
CREATE INDEX "Match_profileId_createdAt_idx" ON "Match"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
