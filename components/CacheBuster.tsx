"use client";

import { useEffect } from "react";

/**
 * CacheBuster v2 — 배포 시 버전을 올려서 기존 브라우저 캐시를 강제 무효화
 * 1. localStorage 버전 비교 → 불일치 시 Service Worker + Cache API 전부 삭제 후 reload
 * 2. 모바일/데스크톱 모든 브라우저 대응
 */
const CURRENT_VERSION = "v2.0.0"; // ← 배포 시마다 이 값만 올리면 됨

export default function CacheBuster() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const localVersion = localStorage.getItem("app_version");

    if (localVersion === CURRENT_VERSION) return; // 이미 최신

    // ── 신규 방문자(버전 기록 없음)는 부술 캐시 자체가 없다 ──
    // 이전 코드는 첫 방문에도 300ms 뒤 전체 reload를 실행해, 모든 첫 방문자가
    // 페이지를 "두 번" 로드했다 (모바일 LCP 7.6s의 주범 — PageSpeed 봇 포함).
    // 신규 방문자는 버전만 기록하고 절대 reload하지 않는다.
    if (!localVersion) {
      localStorage.setItem("app_version", CURRENT_VERSION);
      return;
    }

    console.log(`[CacheBuster] ${localVersion} → ${CURRENT_VERSION}. Purging all caches...`);

    // 1. Service Worker 전부 해제
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }

    // 2. Cache API (SW가 저장한 정적 파일 캐시) 전부 삭제
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // 3. 버전 기록 후 reload
    localStorage.setItem("app_version", CURRENT_VERSION);

    setTimeout(() => {
      window.location.reload();
    }, 300);
  }, []);

  return null;
}
