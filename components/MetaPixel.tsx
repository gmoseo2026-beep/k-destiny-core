"use client";

// 메타 픽셀을 불러오고, 화면이 바뀔 때마다 "페이지를 봄"을 알린다. 이벤트 연결과 주소 가리기는 lib/metaPixel.ts.
// - 운영에서만 메타로 보낸다. 개발 PC(localhost)에서는 보내지 않고 window.__fbqLog 에 기록만 한다(검증용).
// - 관리자 화면으로 처음 들어온 경우에는 불러오지 않는다.
// - 자동 고급 매칭(입력 칸의 이메일·생년월일 등을 읽어 보내는 기능)과 버튼 자동 수집은 쓰지 않는다.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, isAdminPath, isLocalHost, trackMetaPageView } from "@/lib/metaPixel";

type FbqStub = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    const w = window as unknown as { fbq?: FbqStub; _fbq?: FbqStub; __fbqLog?: unknown[][] };
    if (w.fbq || !META_PIXEL_ID) return;
    if (isAdminPath(window.location.pathname)) return;

    if (isLocalHost(window.location.hostname)) {
      // 기록용: 무엇을 보내려 했는지만 남긴다(네트워크 전송 없음)
      const log: unknown[][] = [];
      const stub = ((...args: unknown[]) => {
        log.push([...args, window.location.pathname + window.location.search]);
      }) as FbqStub;
      stub.callMethod = stub;
      stub.queue = [];
      w.__fbqLog = log;
      w.fbq = stub;
      return;
    }

    // 메타가 주는 표준 설치 코드와 같은 동작: 픽셀이 뜨기 전의 호출은 대기열에 쌓였다가 뜬 뒤에 나간다
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as FbqStub;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    w.fbq = fbq;
    if (!w._fbq) w._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);

    // 버튼 누름·페이지 정보 자동 수집을 끈다(정해 둔 이벤트만 보낸다)
    fbq("set", "autoConfig", false, META_PIXEL_ID);
    fbq("init", META_PIXEL_ID);
  }, []);

  useEffect(() => {
    trackMetaPageView();
  }, [pathname]);

  return null;
}
