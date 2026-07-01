"use client";

import { useEffect } from "react";

export default function CacheBuster() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // Use a version string or timestamp from env, fallback to a hardcoded version for this release
    const serverVersion = process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.1";
    const localVersion = localStorage.getItem("app_version");

    if (localVersion !== serverVersion) {
      console.log(`[CacheBuster] Version mismatch: ${localVersion} !== ${serverVersion}. Clearing cache and reloading...`);
      // Update local storage to the new version
      localStorage.setItem("app_version", serverVersion);
      
      // Clear caches (localStorage, sessionStorage) but preserve critical auth if needed
      // Actually, standard cache burst usually just reloads to fetch new JS chunks.
      // We will reload the page once.
      // location.reload() with true is deprecated but some browsers still support it.
      // Alternatively, we can use window.location.href = window.location.href;
      
      // We wrap it in setTimeout to allow the page to mount briefly before reload, preventing infinite loops if something goes wrong
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }, []);

  return null;
}
