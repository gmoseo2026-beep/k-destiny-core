"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import KongdakMascot from "@/components/KongdakMascot";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/gtag";
import { saveLastPerson } from "@/lib/reportHandoff";
import { relationLabel } from "@/lib/compatInvite";

interface CompatInviteClientProps {
  locale: string;
  token: string;
}

type InviteViewState =
  | { status: "loading" }
  | { status: "expired" }
  | { status: "pending"; nameA: string; relation: string };

export default function CompatInviteClient({ locale, token }: CompatInviteClientProps) {
  const router = useRouter();
  const [viewState, setViewState] = useState<InviteViewState>({ status: "loading" });

  const [nameB, setNameB] = useState("");
  const [yearB, setYearB] = useState("");
  const [monthB, setMonthB] = useState("");
  const [dayB, setDayB] = useState("");
  const [genderB, setGenderB] = useState<"F" | "M">("M");
  const [ampmB, setAmpmB] = useState("");
  const [hourB, setHourB] = useState("1");
  const [minB, setMinB] = useState("0");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/compat/invite/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;

        if (json?.status === "completed" && typeof json?.shareToken === "string") {
          router.replace(`/${locale}/compat/${json.shareToken}`);
          return;
        }

        if (res.status === 410 || res.status === 404 || json?.status !== "pending") {
          setViewState({ status: "expired" });
          return;
        }

        const safeNameA =
          typeof json.nameA === "string" && json.nameA.trim() ? json.nameA.trim() : "상대방";
        const safeRelation = typeof json.relation === "string" ? json.relation : "love";

        setViewState({
          status: "pending",
          nameA: safeNameA,
          relation: safeRelation,
        });
        trackEvent("compat_invite_opened", { relation: safeRelation });
      } catch {
        if (alive) setViewState({ status: "expired" });
      }
    })();

    return () => {
      alive = false;
    };
  }, [locale, router, token]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewState.status !== "pending") return;
    setErrorMsg(null);

    if (!yearB || !monthB || !dayB) {
      setErrorMsg("내 생년월일을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const dobB = `${yearB}-${String(monthB).padStart(2, "0")}-${String(dayB).padStart(2, "0")}`;
      let finalTimeB: string | null = null;
      if (ampmB) {
        let h = parseInt(hourB, 10);
        if (ampmB === "PM" && h !== 12) h += 12;
        if (ampmB === "AM" && h === 12) h = 0;
        finalTimeB = `${String(h).padStart(2, "0")}:${String(minB).padStart(2, "0")}`;
      }

      const cleanNameB = nameB.trim() || "상대방";

      const res = await fetch(`/api/compat/invite/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personB: {
            name: cleanNameB,
            dob: dobB,
            time: finalTimeB,
            gender: genderB,
          },
          consentSharedResult: true,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 409 && typeof json?.shareToken === "string") {
        router.replace(`/${locale}/compat/${json.shareToken}`);
        return;
      }

      if (res.status === 410 || res.status === 404) {
        setViewState({ status: "expired" });
        setIsSubmitting(false);
        return;
      }

      if (!res.ok || typeof json?.shareToken !== "string") {
        throw new Error(json?.error || "궁합 계산 중 오류가 발생했습니다.");
      }

      saveLastPerson({
        name: cleanNameB,
        dob: dobB,
        time: finalTimeB,
        gender: genderB,
      });

      trackEvent("compat_invite_completed", { relation: viewState.relation });
      trackEvent("compat_created", { relation: viewState.relation, via: "invite" });

      router.push(`/${locale}/compat/${json.shareToken}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "궁합 계산 중 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  if (viewState.status === "loading") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center py-16 gap-3 text-center">
        <KongdakMascot size={72} expression="couple" animate="heartbeat" />
        <p className="text-sm font-bold text-ink">반쪽 초대장을 확인하고 있어요…</p>
      </div>
    );
  }

  if (viewState.status === "expired") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center py-8">
        <Card className="w-full p-6 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-coral-soft flex items-center justify-center text-2xl">
            💌
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-ink">초대장이 만료됐어요</h1>
            <p className="text-xs text-text-2 leading-relaxed font-medium">
              반쪽 초대장은 보낸 뒤 72시간 동안만 열려요.
              <br />
              아래에서 두 사람의 생년월일을 직접 입력해 궁합을 확인해 보세요.
            </p>
          </div>
          <Link
            href={`/${locale}/compat/new`}
            className="w-full rounded-2xl bg-coral hover:bg-coral-deep text-white py-3.5 px-4 text-sm font-extrabold shadow-xs transition-all active:scale-[0.96] text-center"
          >
            일반 궁합 입력하러 가기
          </Link>
        </Card>
      </div>
    );
  }

  const { nameA, relation } = viewState;

  return (
    <form onSubmit={handleComplete} className="w-full max-w-md mx-auto flex flex-col gap-5 pb-12">
      {/* 상단 반쪽 초대장 비주얼 카드 */}
      <div className="w-full bg-gradient-to-br from-[#FF8AA1] via-[coral] to-[plum] rounded-3xl p-6 text-white text-center shadow-lg relative overflow-hidden">
        <span className="inline-flex items-center gap-1 bg-black/25 backdrop-blur-sm text-gold px-3 py-1 rounded-full text-xs font-extrabold mb-3">
          💌 {relationLabel(relation)} 반쪽 초대장
        </span>

        <h1 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
          {nameA}님이 반쪽을 채워뒀어요!
        </h1>
        <p className="text-xs font-semibold text-white/90 mt-1">
          내 생년월일만 넣으면 우리 두 사람의 궁합 점수가 바로 열려요
        </p>

        {/* 두 사람 반쪽 연결 비주얼 */}
        <div className="relative flex items-center justify-between w-full max-w-xs mx-auto mt-5 px-2">
          <div className="flex flex-col items-center gap-1.5 z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md p-1 border border-white/40 shadow-md flex items-center justify-center">
              <KongdakMascot size={50} expression="canon" animate="pulse" />
            </div>
            <span className="text-xs font-extrabold text-white bg-black/25 px-2.5 py-0.5 rounded-full truncate max-w-[96px]">
              {nameA}
            </span>
            <span className="text-[10px] font-extrabold text-gold">입력 완료 ✓</span>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 px-1 z-10">
            <div className="w-14 h-12 flex items-center justify-center">
              <KongdakMascot size={52} expression="couple" animate="heartbeat" />
            </div>
            <span className="text-[10px] font-extrabold text-white/90 bg-black/25 px-2 py-0.5 rounded-full">
              ? 점
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5 z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md p-1 border-2 border-dashed border-gold/80 shadow-md flex items-center justify-center">
              <span className="text-2xl font-black text-gold">?</span>
            </div>
            <span className="text-xs font-extrabold text-white bg-black/25 px-2.5 py-0.5 rounded-full truncate max-w-[96px]">
              {nameB.trim() || "내 차례"}
            </span>
            <span className="text-[10px] font-bold text-white/80">생년월일만 입력</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-coral-soft border border-coral text-coral-deep p-3.5 rounded-xl text-sm font-semibold text-center">
          {errorMsg}
        </div>
      )}

      {/* 받는 사람(Person B) 입력 카드 */}
      <Card className="p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <span className="text-base">💖</span>
          <h2 className="font-bold text-sm text-ink">내 정보 입력</h2>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-2 mb-1">
            내 이름 또는 애칭 (선택)
          </label>
          <input
            type="text"
            value={nameB}
            onChange={(e) => setNameB(e.target.value)}
            placeholder="예: 이설렘"
            className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white focus-visible:ring-2 ring-coral"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-2 mb-1">
              생년월일 <span className="text-coral">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={yearB}
                onChange={(e) => setYearB(e.target.value)}
                className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white focus-visible:ring-2 ring-coral"
              >
                <option value="">년도</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <select
                value={monthB}
                onChange={(e) => setMonthB(e.target.value)}
                className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white focus-visible:ring-2 ring-coral"
              >
                <option value="">월</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
              <select
                value={dayB}
                onChange={(e) => setDayB(e.target.value)}
                className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white focus-visible:ring-2 ring-coral"
              >
                <option value="">일</option>
                {Array.from({ length: getDaysInMonth(yearB, monthB) }, (_, i) => i + 1).map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}일
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-text-2 mb-1">성별</label>
              <select
                value={genderB}
                onChange={(e) => setGenderB(e.target.value as "M" | "F")}
                className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white focus-visible:ring-2 ring-coral"
              >
                <option value="M">남성</option>
                <option value="F">여성</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-text-2 mb-1">
                태어난 시간 (선택)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={ampmB}
                  onChange={(e) => setAmpmB(e.target.value)}
                  className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white focus-visible:ring-2 ring-coral"
                >
                  <option value="">모름</option>
                  <option value="AM">오전</option>
                  <option value="PM">오후</option>
                </select>
                <select
                  value={hourB}
                  onChange={(e) => setHourB(e.target.value)}
                  disabled={!ampmB}
                  className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white disabled:opacity-50 focus-visible:ring-2 ring-coral"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {h}시
                    </option>
                  ))}
                </select>
                <select
                  value={minB}
                  onChange={(e) => setMinB(e.target.value)}
                  disabled={!ampmB}
                  className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:border-coral bg-white disabled:opacity-50 focus-visible:ring-2 ring-coral"
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>
                      {m}분
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 받는 사람 결과 공유 안내 (체크박스 없이 버튼 위 고지 + 버튼 클릭 동의) */}
      <div className="rounded-2xl bg-surface-soft border border-line p-3.5 text-left">
        <p className="text-xs text-text-2 leading-relaxed font-medium">
          궁합을 열면 결과(점수·해석·이름)가 이 링크를 가진 사람에게 보여요. 보낸 {nameA}님도 볼 수 있어요. 내 생년월일과 태어난 시간은 보여 주지 않아요.
        </p>
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        동의하고 우리 궁합 열기
      </Button>
    </form>
  );
}
