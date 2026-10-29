-- Argon-13: 운세 선물하기 GiftCode 테이블 추가 (additive)
CREATE TABLE IF NOT EXISTS "GiftCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "catalogId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "senderNickname" TEXT,
  "recipientNickname" TEXT NOT NULL,
  "message" TEXT,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "redeemedOrderId" TEXT,
  "redeemedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GiftCode_code_key" ON "GiftCode"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "GiftCode_purchaseOrderId_key" ON "GiftCode"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "GiftCode_catalogId_idx" ON "GiftCode"("catalogId");
CREATE INDEX IF NOT EXISTS "GiftCode_purchaseOrderId_idx" ON "GiftCode"("purchaseOrderId");
