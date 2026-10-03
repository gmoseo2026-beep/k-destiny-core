import { CATALOG, getProduct } from "@/lib/catalog";

/**
 * 이 기기에 남아 있는 결제 증명(orderId) 목록 — 비회원이 결제한 리포트를 다시 찾아 들어오는 길.
 *
 * 2026-10-03: 비회원이 총운을 결제하고 본 뒤 상품 화면으로 다시 들어오자 미리보기와 결제 안내만 나왔다.
 * 입력·상품 화면이 "이 기기에 결제 내역이 있는지"를 보지 않았기 때문이다(다른 상품도 같았다).
 * 토큰은 lib/payments/client.ts 가 localStorage 에 `kongdak_order_<상품 id>[_<궁합 id>]` 로 남긴다.
 * 여기서는 그 키를 읽어 "무엇을 샀는지"로 되돌린다. 열람 판정은 언제나 서버가 한다.
 */
const ORDER_PREFIX = "kongdak_order_";
const UNLOCK_PREFIX = "kongdak_unlock_";

export interface DeviceOrder {
  /** 결제한 상품(단품 또는 세트) */
  catalogId: string;
  compatId: string | null;
  orderId: string;
}

// 긴 id 부터 맞춰 본다("set_2027" 과 "set_2027_x" 같은 접두 충돌 방지)
const IDS_BY_LENGTH = CATALOG.map((c) => c.id).sort((a, b) => b.length - a.length);

/** localStorage 키 → (상품 id, 궁합 id). 모르는 키는 null. */
export function parseOrderTokenKey(key: string): { catalogId: string; compatId: string | null } | null {
  if (!key.startsWith(ORDER_PREFIX)) return null;
  const rest = key.slice(ORDER_PREFIX.length);
  for (const id of IDS_BY_LENGTH) {
    if (rest === id) return { catalogId: id, compatId: null };
    if (rest.startsWith(id + "_") && rest.length > id.length + 1) {
      return { catalogId: id, compatId: rest.slice(id.length + 1) };
    }
  }
  return null;
}

export function listDeviceOrders(): DeviceOrder[] {
  if (typeof window === "undefined") return [];
  const out: DeviceOrder[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const parsed = parseOrderTokenKey(key);
      const orderId = parsed ? window.localStorage.getItem(key) : null;
      if (parsed && orderId) out.push({ ...parsed, orderId });
    }
  } catch {
    // 저장소 접근 불가(시크릿 모드 등) — 결제 내역 없음으로 본다
  }
  return out;
}

/** 이 상품을 열 수 있는 결제: 그 상품을 직접 샀거나, 그 상품이 든 세트를 산 경우 */
export function ownedOrdersFor(catalogId: string, orders: DeviceOrder[]): DeviceOrder[] {
  return orders.filter(
    (o) => o.catalogId === catalogId || !!getProduct(o.catalogId)?.items?.includes(catalogId)
  );
}

/**
 * 결제한 리포트를 여는 주소.
 * target 은 지금 보고 있는 상품(없으면 결제한 상품 자체). 총운·정통 궁합은 전용 화면, 나머지는 리포트 화면.
 */
export function deviceOrderHref(locale: string, order: DeviceOrder, target: string = order.catalogId): string {
  if (target.startsWith("annual_")) return `/${locale}/fortune/annual?year=${target.replace("annual_", "")}`;
  if (target === "compat_basic" && order.compatId) return `/${locale}/compat/${order.compatId}`;
  const compat = order.compatId ? `&compat=${encodeURIComponent(order.compatId)}` : "";
  return `/${locale}/report/new?c=${order.catalogId}${compat}`;
}

/** 서버가 무효(환불·만료)라고 한 결제 증명을 이 기기에서 지운다. */
export function forgetDeviceOrder(orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith(ORDER_PREFIX) || key.startsWith(UNLOCK_PREFIX)) && window.localStorage.getItem(key) === orderId) {
        doomed.push(key);
      }
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // 무시
  }
}

/**
 * 서버에 유효한 결제만 남기고(환불·만료는 기기에서 지움) 돌려준다.
 * 서버에 못 물어보면 있는 그대로 돌려준다 — 그 경우에도 열람 화면에서 서버가 다시 판정한다.
 */
export async function listValidDeviceOrders(): Promise<DeviceOrder[]> {
  const orders = listDeviceOrders();
  if (orders.length === 0) return [];
  try {
    // 한 번에 30건까지만 묻는다. 묻지 않은 건은 판단하지 않고 그대로 둔다.
    const asked = [...new Set(orders.map((o) => o.orderId))].slice(0, 30);
    const res = await fetch("/api/payments/owned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: asked }),
    });
    if (!res.ok) return orders;
    const json = (await res.json()) as { valid?: string[] };
    const valid = new Set(json.valid ?? []);
    const invalid = new Set(asked.filter((id) => !valid.has(id)));
    invalid.forEach((id) => forgetDeviceOrder(id));
    return orders.filter((o) => !invalid.has(o.orderId));
  } catch {
    return orders;
  }
}
