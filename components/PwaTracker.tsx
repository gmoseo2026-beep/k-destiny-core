"use client";

// 홈 화면에 설치한 앱(PWA)의 설치·실행을 센다(/api/pwa/event → 관리자 > 회원·설치).
// - 설치: 브라우저가 알려 줄 때(appinstalled — 안드로이드·PC 크롬 계열)
// - 실행: 설치된 앱으로 열렸을 때 탭 세션당 1회. 이 기기에서 처음이면 first=true("설치한 기기 수")
// GA4: pwa_installed {} · pwa_launch { first }
import { useEffect } from "react";
import { trackEvent } from "@/lib/gtag";

const LAUNCH_KEY = "kongdak_pwa_launch";
const DEVICE_KEY = "kongdak_pwa_device";

function post(body: { type: "install" | "launch"; first?: boolean }): Promise<boolean> {
  return fetch("/api/pwa/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then((r) => r.ok)
    .catch(() => false);
}

export default function PwaTracker() {
  useEffect(() => {
    const onInstalled = () => {
      void post({ type: "install" });
      trackEvent("pwa_installed", {});
    };
    window.addEventListener("appinstalled", onInstalled);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      let already = false;
      let first = false;
      try {
        already = !!window.sessionStorage.getItem(LAUNCH_KEY);
        if (!already) window.sessionStorage.setItem(LAUNCH_KEY, "1");
        first = !window.localStorage.getItem(DEVICE_KEY);
      } catch {
        // 저장소를 못 쓰는 환경이면 처음 여부를 알 수 없다 → 실행만 센다
      }
      if (!already) {
        void post({ type: "launch", first }).then((ok) => {
          if (!ok || !first) return;
          try {
            window.localStorage.setItem(DEVICE_KEY, String(Date.now()));
          } catch {}
        });
        trackEvent("pwa_launch", { first });
      }
    }
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
