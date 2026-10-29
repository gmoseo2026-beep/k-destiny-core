/**
 * 서버 구매 전환 전송 (메타 Conversions API · 틱톡 Events API v1.3)
 *
 * 지키는 원칙 (Argon 15):
 * 1. 중복 제거: 브라우저 픽셀(lib/metaPixel.ts, lib/tiktokPixel.ts)의 purchase event_id는
 *    receiptId(= Order.id, DB 기본키)를 쓴다. 서버 전환도 동일한 Order.id를 event_id로 보낸다.
 *    (비회원 열람 열쇠인 Order.orderId는 절대 외부로 보내지 않는다.)
 * 2. 허용 신호만 전송: 주문 생성 시 서버가 읽은 IP, User-Agent, _fbp/_fbc/_ttp/ttclid 쿠키값과
 *    금액(value)·통화(KRW)·상품 ID(catalogId)만 보낸다.
 *    이름·전화번호·이메일(해시 포함)·생년월일은 절대 저장하거나 전송하지 않는다.
 * 3. 토큰 보호 및 무중단: META_CAPI_TOKEN, TIKTOK_EVENTS_TOKEN이 없으면 조용히 건너뛴다.
 *    토큰을 코드·로그·문서에 남기지 않으며, 3초 타임아웃과 try/catch로 결제 처리를 절대 막지 않는다.
 */
import { META_PIXEL_ID } from "@/lib/metaPixel";
import { TIKTOK_PIXEL_ID } from "@/lib/tiktokPixel";

export const CAPI_TIMEOUT_MS = 3000;
const META_GRAPH_VERSION = "v21.0";
const TIKTOK_EVENTS_ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const MAX_SIGNAL_LEN = 512;

export type OrderAdSignals = {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  ttp?: string;
  ttclid?: string;
};

export interface ServerPurchaseConversionInput {
  /** 브라우저 purchase의 transaction_id(= receiptId = Order.id)와 동일한 중복 제거 ID */
  eventId: string;
  /** 실제 결제 금액 (원 단위) */
  value: number;
  /** 카탈로그 상품 ID (예: "inner_mind", "annual_2027") */
  catalogId: string;
  /** 주문 생성 시 저장한 Order.adSignals */
  adSignals?: unknown;
  /** 이벤트 시각 (기본값: 현재 시각) */
  eventTime?: Date;
}

export type ConversionSendStatus = "sent" | "skipped" | "failed";

export interface ConversionSendResult {
  meta: ConversionSendStatus;
  tiktok: ConversionSendStatus;
}

function cleanSignal(raw: unknown, maxLen: number = MAX_SIGNAL_LEN): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.replace(/[\r\n\0]/g, "").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const rawVal = part.slice(eq + 1).trim();
    if (!key || !rawVal) continue;
    try {
      out[key] = decodeURIComponent(rawVal);
    } catch {
      out[key] = rawVal;
    }
  }
  return out;
}

function extractClientIp(headers: Pick<Headers, "get">): string | undefined {
  const cfIp = cleanSignal(headers.get("cf-connecting-ip"), 64);
  if (cfIp) return cfIp;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const firstHop = cleanSignal(xff.split(",")[0], 64);
    if (firstHop) return firstHop;
  }

  return cleanSignal(headers.get("x-real-ip"), 64);
}

/**
 * 주문 생성 요청(POST /api/payments/order)에서 서버 전환 매칭에 허용된 최소 신호만 추출한다.
 * 이름·전화·이메일·생년월일은 읽지도 저장하지도 않는다.
 */
export function extractOrderAdSignals(req: { headers: Pick<Headers, "get"> }): OrderAdSignals | null {
  const ip = extractClientIp(req.headers);
  const userAgent = cleanSignal(req.headers.get("user-agent"));
  const cookies = parseCookies(req.headers.get("cookie"));

  const fbp = cleanSignal(cookies._fbp);
  const fbc = cleanSignal(cookies._fbc);
  const ttp = cleanSignal(cookies._ttp);
  const ttclid = cleanSignal(cookies.ttclid ?? cookies._ttclid);

  const signals: OrderAdSignals = {
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    ...(ttp ? { ttp } : {}),
    ...(ttclid ? { ttclid } : {}),
  };

  return Object.keys(signals).length > 0 ? signals : null;
}

/**
 * DB JSON 컬럼에서 읽은 값을 허용된 6개 키로만 정규화한다(화이트리스트 외 모든 키 폐기).
 */
export function normalizeOrderAdSignals(raw: unknown): OrderAdSignals {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const ip = cleanSignal(obj.ip, 64);
  const userAgent = cleanSignal(obj.userAgent);
  const fbp = cleanSignal(obj.fbp);
  const fbc = cleanSignal(obj.fbc);
  const ttp = cleanSignal(obj.ttp);
  const ttclid = cleanSignal(obj.ttclid);

  return {
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    ...(ttp ? { ttp } : {}),
    ...(ttclid ? { ttclid } : {}),
  };
}

export function buildMetaPurchasePayload(input: ServerPurchaseConversionInput) {
  const eventTimeSec = Math.floor((input.eventTime ?? new Date()).getTime() / 1000);
  const signals = normalizeOrderAdSignals(input.adSignals);

  const userData: Record<string, string> = {
    ...(signals.ip ? { client_ip_address: signals.ip } : {}),
    ...(signals.userAgent ? { client_user_agent: signals.userAgent } : {}),
    ...(signals.fbp ? { fbp: signals.fbp } : {}),
    ...(signals.fbc ? { fbc: signals.fbc } : {}),
  };

  const customData: Record<string, string | number | string[]> = {
    value: input.value,
    currency: "KRW",
    ...(input.catalogId ? { content_ids: [input.catalogId], content_type: "product" } : {}),
  };

  return {
    data: [
      {
        event_name: "Purchase" as const,
        event_time: eventTimeSec,
        event_id: input.eventId,
        action_source: "website" as const,
        user_data: userData,
        custom_data: customData,
      },
    ],
  };
}

export function buildTikTokCompletePaymentPayload(input: ServerPurchaseConversionInput, pixelId: string) {
  const eventTimeSec = Math.floor((input.eventTime ?? new Date()).getTime() / 1000);
  const signals = normalizeOrderAdSignals(input.adSignals);

  const user: Record<string, string> = {
    ...(signals.ip ? { ip: signals.ip } : {}),
    ...(signals.userAgent ? { user_agent: signals.userAgent } : {}),
    ...(signals.ttp ? { ttp: signals.ttp } : {}),
    ...(signals.ttclid ? { ttclid: signals.ttclid } : {}),
  };

  const properties: Record<string, unknown> = {
    value: input.value,
    currency: "KRW",
    ...(input.catalogId
      ? {
          content_type: "product",
          contents: [{ content_id: input.catalogId, content_type: "product" }],
        }
      : {}),
  };

  return {
    event_source: "web" as const,
    event_source_id: pixelId,
    data: [
      {
        event: "CompletePayment" as const,
        event_time: eventTimeSec,
        event_id: input.eventId,
        user,
        properties,
      },
    ],
  };
}

async function postJsonWithTimeout(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number = CAPI_TIMEOUT_MS
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res.ok;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 메타 CAPI(Purchase)와 틱톡 Events API(CompletePayment)를 서버에서 전송한다.
 * - 토큰이 없으면 조용히 건너뛴다.
 * - 3초 타임아웃과 try/catch로 감싸 어떤 경우에도 예외를 밖으로 던지지 않는다.
 * - 토큰이나 민감 정보를 절대 로그에 남기지 않는다.
 */
export async function sendServerPurchaseConversions(
  input: ServerPurchaseConversionInput,
  options?: { timeoutMs?: number }
): Promise<ConversionSendResult> {
  if (!input.eventId || typeof input.value !== "number" || !Number.isFinite(input.value) || input.value <= 0) {
    return { meta: "skipped", tiktok: "skipped" };
  }

  const timeoutMs = options?.timeoutMs ?? CAPI_TIMEOUT_MS;
  const metaToken = process.env.META_CAPI_TOKEN?.trim() || "";
  const tiktokToken = process.env.TIKTOK_EVENTS_TOKEN?.trim() || "";
  const metaPixelId = (process.env.META_PIXEL_ID || META_PIXEL_ID).trim();
  const tiktokPixelId = (process.env.TIKTOK_PIXEL_ID || TIKTOK_PIXEL_ID).trim();

  const sendMeta = async (): Promise<ConversionSendStatus> => {
    if (!metaToken || !metaPixelId) return "skipped";
    try {
      const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(metaPixelId)}/events`;
      const ok = await postJsonWithTimeout(
        url,
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${metaToken}`,
        },
        buildMetaPurchasePayload(input),
        timeoutMs
      );
      if (!ok) {
        console.warn("[adConversions] meta CAPI non-2xx response");
        return "failed";
      }
      return "sent";
    } catch (err) {
      const reason = err instanceof Error ? err.name : "unknown";
      console.warn(`[adConversions] meta CAPI failed (${reason})`);
      return "failed";
    }
  };

  const sendTikTok = async (): Promise<ConversionSendStatus> => {
    if (!tiktokToken || !tiktokPixelId) return "skipped";
    try {
      const ok = await postJsonWithTimeout(
        TIKTOK_EVENTS_ENDPOINT,
        {
          "Content-Type": "application/json",
          "Access-Token": tiktokToken,
        },
        buildTikTokCompletePaymentPayload(input, tiktokPixelId),
        timeoutMs
      );
      if (!ok) {
        console.warn("[adConversions] tiktok Events API non-2xx response");
        return "failed";
      }
      return "sent";
    } catch (err) {
      const reason = err instanceof Error ? err.name : "unknown";
      console.warn(`[adConversions] tiktok Events API failed (${reason})`);
      return "failed";
    }
  };

  const [metaRes, tiktokRes] = await Promise.all([sendMeta(), sendTikTok()]);
  return { meta: metaRes, tiktok: tiktokRes };
}
