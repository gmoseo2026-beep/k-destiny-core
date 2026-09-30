"use client";

// 회원 대시보드 맨 위 "오늘의 운세". 회원·날짜별로 한 번 생성되고 서버에 저장된다(/api/fortune/daily).
// 사주 정보를 저장하지 않은 회원에게는 저장 안내를 보여 준다.
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronDown, ChevronUp, Sun } from "lucide-react";
import { trackEvent } from "@/lib/gtag";

interface DailyContent {
  dayScore: number;
  oneLine: string;
  action: string;
  goodTiming: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: DailyContent }
  | { kind: "needProfile" }
  | { kind: "error" };

function todayLabel(): string {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}

export default function DailyFortuneCard({ isPassActive }: { isPassActive: boolean }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/fortune/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "ko" }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && json?.data?.oneLine) {
          setState({ kind: "ready", data: json.data as DailyContent });
          trackEvent("daily_view", {});
        } else if (json?.needProfile) {
          setState({ kind: "needProfile" });
        } else {
          setState({ kind: "error" });
        }
      })
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === "error") return null;

  if (state.kind === "needProfile") {
    return (
      <Link
        href="/onboarding"
        onClick={() => trackEvent("daily_need_profile_click", {})}
        className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-coral/40 bg-coral-soft p-4 active:scale-[0.98] transition-all"
      >
        <span>
          <span className="block text-sm font-extrabold text-coral-deep">매일 오늘의 운세 받기</span>
          <span className="block text-xs text-text-2 mt-0.5">사주 정보를 한 번 저장하면 매일 새로 풀어 드려요</span>
        </span>
        <span className="shrink-0 text-xs font-bold text-coral-deep underline">저장하기</span>
      </Link>
    );
  }

  return (
    <section className="mb-4 rounded-2xl border-[1.5px] border-coral/50 bg-white p-4" aria-label="오늘의 운세">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-extrabold text-coral-deep">
          <Sun className="w-3.5 h-3.5" aria-hidden />
          오늘의 운세 · {todayLabel()}
        </span>
        <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[10px] font-bold text-coral-deep">매일 새로</span>
      </div>

      {state.kind === "loading" ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="h-4 w-4/5 rounded-full bg-surface-soft animate-pulse" />
          <div className="h-3 w-1/2 rounded-full bg-surface-soft animate-pulse" />
        </div>
      ) : (
        <>
          <p className="mt-2 text-[15px] font-extrabold leading-snug text-ink">&ldquo;{state.data.oneLine}&rdquo;</p>
          <p className="mt-1 text-xs font-semibold text-coral-deep">{state.data.goodTiming}</p>
          {open && <p className="mt-2 text-sm leading-relaxed text-text-2">{state.data.action}</p>}
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                if (!open) trackEvent("daily_open", {});
              }}
              className="flex items-center gap-0.5 text-xs font-bold text-ink active:scale-[0.96]"
              aria-expanded={open}
            >
              {open ? "접기" : "오늘 할 일 보기"}
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {isPassActive && (
              <Link href="/fortune/weekly" className="text-xs font-bold text-coral underline">
                이번 주 운세 보기
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}
