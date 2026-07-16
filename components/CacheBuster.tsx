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
