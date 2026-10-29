-- argon/12-set-upgrade: 단품 결제 후 24시간 내 차액 세트 업그레이드 원본 주문번호 추가 (additive)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "upgradeFromOrderId" TEXT;
CREATE INDEX IF NOT EXISTS "Order_upgradeFromOrderId_idx" ON "Order"("upgradeFromOrderId");
