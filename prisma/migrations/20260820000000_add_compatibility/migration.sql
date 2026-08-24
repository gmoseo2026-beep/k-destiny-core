-- CreateTable
CREATE TABLE IF NOT EXISTS "Compatibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "personA" JSONB NOT NULL,
    "personB" JSONB NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'love',
    "score" INTEGER NOT NULL,
    "keywords" TEXT[],
    "breakdown" JSONB NOT NULL,
    "summaryKo" TEXT,
    "premiumKo" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT NOT NULL,
    "sourceCompatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Compatibility_shareToken_key" ON "Compatibility"("shareToken");
