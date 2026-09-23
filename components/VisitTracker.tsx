"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !sessionStorage.getItem("kd_visit_sent")) {
        sessionStorage.setItem("kd_visit_sent", "1");
        fetch("/api/visit", {
          method: "POST",
          keepalive: true,
        }).catch(() => {
          // Ignore network errors so UX is never impacted
        });
      }
    } catch {
      // Storage access may be restricted in private/sandbox mode; fail silently
    }
  }, []);

  return null;
}
