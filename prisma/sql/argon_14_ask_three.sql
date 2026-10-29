-- Argon 14: 두근이에게 묻기 (ask_three) 주문 질문 3개 저장용 additive 마이그레이션
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "askQuestions" JSONB;
