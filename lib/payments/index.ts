import { tossProvider } from "./toss";
import { portoneProvider } from "./portone";

export const payments =
  process.env.PG_PROVIDER === "portone" ? portoneProvider : tossProvider;

