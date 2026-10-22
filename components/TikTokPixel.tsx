"use client";

// 틱톡 픽셀을 불러오고, 화면이 바뀔 때마다 "페이지를 봄"을 알린다. 이벤트 연결은 lib/tiktokPixel.ts.
// - 운영에서만 틱톡으로 보낸다. 개발 PC(localhost)에서는 보내지 않고 window.__ttqLog 에 기록만 한다(검증용).
// - 관리자 화면으로 처음 들어온 경우에는 불러오지 않는다.
// - 불러오는 방식은 틱톡이 주는 표준 설치 코드와 같다: 스크립트가 뜨기 전의 호출은 대기열에 쌓였다가 뜬 뒤에 나간다.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isAdminPath, isLocalHost } from "@/lib/metaPixel";
import { TIKTOK_PIXEL_ID, trackTikTokPageView } from "@/lib/tiktokPixel";

type Queue = unknown[] & Record<string, unknown>;
const METHODS = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];

export default function TikTokPixel() {
  const pathname = usePathname();

  useEffect(() => {
    const w = window as unknown as { ttq?: Queue; TiktokAnalyticsObject?: string; __ttqLog?: unknown[][] };
    if (w.ttq || !TIKTOK_PIXEL_ID) return;
    if (isAdminPath(window.location.pathname)) return;

    if (isLocalHost(window.location.hostname)) {
      // 기록용: 무엇을 보내려 했는지만 남긴다(네트워크 전송 없음)
      const log: unknown[][] = [];
      const stub = {} as Queue;
      for (const m of METHODS) stub[m] = (...args: unknown[]) => log.push([m, ...args, window.location.pathname + window.location.search]);
      w.__ttqLog = log;
      w.ttq = stub;
      return;
    }

    w.TiktokAnalyticsObject = "ttq";
    const ttq = [] as unknown as Queue;
    const defer = (target: Queue, method: string) => {
      target[method] = (...args: unknown[]) => {
        target.push([method, ...args]);
      };
    };
    for (const m of METHODS) defer(ttq, m);
    ttq.methods = METHODS;
    ttq.setAndDefer = defer;
    ttq.instance = (id: string) => {
      const inst = ((ttq._i as Record<string, Queue>)[id] || []) as Queue;
      for (const m of METHODS) defer(inst, m);
      return inst;
    };
    ttq.load = (id: string, options?: Record<string, unknown>) => {
      const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
      const pixel = [] as unknown as Queue;
      pixel._u = src;
      ttq._i = { ...((ttq._i as object) || {}), [id]: pixel };
      ttq._t = { ...((ttq._t as object) || {}), [id]: Date.now() };
      ttq._o = { ...((ttq._o as object) || {}), [id]: options || {} };
      const script = document.createElement("script");
      script.async = true;
      script.src = `${src}?sdkid=${encodeURIComponent(id)}&lib=ttq`;
      document.head.appendChild(script);
    };
    w.ttq = ttq;
    (ttq.load as (id: string) => void)(TIKTOK_PIXEL_ID);
  }, []);

  useEffect(() => {
    trackTikTokPageView();
  }, [pathname]);

  return null;
}
