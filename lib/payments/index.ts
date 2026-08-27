import { PaymentProvider } from "./provider";
import { tossProvider } from "./toss";

const providerName = process.env.PG_PROVIDER || "toss";

let provider: PaymentProvider;

if (providerName === "toss") {
  provider = tossProvider;
} else {
  // 나중에 nice 등이 추가되면 여기에 분기 처리
  provider = tossProvider; 
}

export const payments = provider;
