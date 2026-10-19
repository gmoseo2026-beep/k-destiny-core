-- P-014: Compatibility.locale 추가 (null 또는 "ko" = 한국어, "en" | "ja" | "zh" = 외국어)
ALTER TABLE "Compatibility" ADD COLUMN IF NOT EXISTS "locale" TEXT;
