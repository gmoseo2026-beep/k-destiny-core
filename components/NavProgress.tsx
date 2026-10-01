"use client";

// 링크를 누르는 즉시 화면 맨 위에 진행 표시를 띄운다.
// 서버 응답을 기다리는 동안 화면이 그대로면 "안 눌렸나?" 하고 다시 누르거나 나가기 때문.
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 주소가 바뀌면(=새 화면이 그려지면) 끈다
  useEffect(() => {
    queueMicrotask(() => setActive(false));
    if (timer.current) clearTimeout(timer.current);
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      // 이동이 취소되거나 실패해도 표시가 남지 않게
      timer.current = setTimeout(() => setActive(false), 10_000);
    };
    // capture 단계에서 받는다: next/link 가 클릭을 preventDefault 한 뒤에는 "처리된 클릭"으로 보여 놓친다
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!active) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px] overflow-hidden bg-coral-soft">
      <div className="nav-progress-bar h-full w-1/3 rounded-full bg-coral" />
    </div>
  );
}
