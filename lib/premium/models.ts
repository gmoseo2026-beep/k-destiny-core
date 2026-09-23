import { PREMIUM_MODELS as BASE_PREMIUM_MODELS } from "@/lib/destinyGen";

export const PREMIUM_MODELS = [
  process.env.GEMINI_PREMIUM_MODEL || "gemini-2.5-pro",
  ...BASE_PREMIUM_MODELS,
];
