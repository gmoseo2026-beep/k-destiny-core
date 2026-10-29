-- Argon 15: 메타 CAPI · 틱톡 Events API 서버 전환 신호 저장용 컬럼 추가 (additive)
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "adSignals" JSONB;
