"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * 요소가 화면에 절반 이상 들어온 첫 순간에 한 번만 onSeen 을 부른다.
 * view_paywall 처럼 "실제로 봤는지"를 재는 이벤트용 — 렌더만 됐을 때는 세지 않는다.
 */
export function useSeenOnce(ref: RefObject<Element | null>, onSeen: () => void, enabled = true): void {
  const firedRef = useRef(false);
  const cbRef = useRef(onSeen);
  useEffect(() => {
    cbRef.current = onSeen;
  });

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || firedRef.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !firedRef.current) {
          firedRef.current = true;
          cbRef.current();
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
}
