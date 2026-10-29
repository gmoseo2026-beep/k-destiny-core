"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/gtag";

export default function IljuViewTracker({ slug }: { slug: string }) {
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (trackedRef.current === slug) return;
    trackedRef.current = slug;
    trackEvent("ilju_view", { ilju: slug });
  }, [slug]);

  return null;
}
