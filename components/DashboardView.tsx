"use client";

import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { ArrowRight, ChevronDown, ChevronUp, Bell, Calendar } from "lucide-react";
import { subscribeToPush } from "@/lib/push";
import { CatalogItem, priceLabel } from "@/lib/catalog";

const noopSubscribe = () => () => {};
const readNotifPermission = (): string =>
  typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default";
const serverNotifPermission = (): string => "default";

interface CompatItem {
  id: string;
  shareToken: string;
  relation: string;
  score: number;
  keywords: string[];
  createdAt: string;
  personA: { name: string; gender: string };
  personB: { name: string; gender: string };
}

export default function DashboardView({ effectiveProducts }: { effectiveProducts?: CatalogItem[] }) {
  const { data: session } = useSession();
  const [historyItems, setHistoryItems] = useState<CompatItem[]>([]);
  const [purchasedCatalogIds, setPurchasedCatalogIds] = useState<Set<string>>(new Set());
  const [mineCount, setMineCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [now] = useState(() => Date.now());

  const notifPermission = useSyncExternalStore(
    noopSubscribe,
    readNotifPermission,
    serverNotifPermission
  );
  const [, refreshNotifPermission] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        subscribeToPush();
      }
    }
  }, [session]);

  const handleEnableNotif = async () => {
    const res = await subscribeToPush();
    if (res.success) refreshNotifPermission();
  };

  const [claimToast, setClaimToast] = useState<string | null>(null);
  const [claimAvailable, setClaimAvailable] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    let isMounted = true;

    // 1) 연동 가능 여부 체크
    fetch("/api/user/claim-unlock")
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (isMounted && result?.claimable) setClaimAvailable(true);
      })
      .catch(() => {});

    // 2) 내 구매 리포트 목록 조회 (/api/reports/mine)
    fetch("/api/reports/mine")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          const list: Array<{ catalogId?: string; reports?: Array<{ catalogId?: string }> }> = Array.isArray(data)
            ? data
            : Array.isArray(data?.reports)
            ? data.reports
            : [];
          setMineCount(list.length);
          const ids = new Set<string>();
          for (const item of list) {
            if (item.catalogId) ids.add(item.catalogId);
            if (Array.isArray(item.reports)) {
              for (const r of item.reports) if (r.catalogId) ids.add(r.catalogId);
            }
          }
          setPurchasedCatalogIds(ids);
        }
      })
      .catch(() => {});

    // 3) 궁합 기록 조회 (/api/compat)
    fetch("/api/compat")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data?.items)) {
          setHistoryItems(data.items);
        }
      })
      .catch((err) => {
        console.error("Failed to load compat history:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleClaimUnlock = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch("/api/user/claim-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setClaimAvailable(false);
      if (res.ok) {
        setClaimToast("구매하신 궁합 결과가 내 계정에 안전하게 연동되었습니다! 🎉");
        setTimeout(() => setClaimToast(null), 4500);
        const data = await fetch("/api/compat").then((r) => r.json());
        if (Array.isArray(data?.items)) setHistoryItems(data.items);
      } else {
        setClaimToast("연동할 수 있는 결제를 찾지 못했어요.");
        setTimeout(() => setClaimToast(null), 3500);
      }
    } catch {
      setClaimToast("연동 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setTimeout(() => setClaimToast(null), 3500);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCardClick = (itemId: string) => {
    if (typeof window !== "undefined") {
      const w = window as unknown as { gtag?: (event: string, action: string, params: Record<string, unknown>) => void };
      if (w.gtag) {
        w.gtag("event", "select_content", {
          location: "member_dashboard",
          item_id: itemId,
        });
      }
    }
  };

  const user = session?.user as { name?: string | null; tier?: string; premiumEndDate?: string | null } | undefined;
  const firstName = user?.name?.split(" ")[0] || "회원";
  const userTier = user?.tier;
  const userPremiumEnd = user?.premiumEndDate;
  const isPassActive =
    userTier === "PREMIUM" && (!userPremiumEnd || new Date(userPremiumEnd).getTime() > now);

  // 이어서 보면 좋은 추천 리포트: 미구매 표준 상품 중 featuredOrder 순 상위 3개
  const allProducts = effectiveProducts || [];
  const recommendedReports = allProducts
    .filter((p) => p.tier === "standard" && p.type !== "SET" && !purchasedCatalogIds.has(p.id))
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
    .slice(0, 3);

  const displayedHistory = showAllHistory ? historyItems : historyItems.slice(0, 5);

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-8 relative">
      {claimToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-plum-deep text-white px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce border border-white/20">
          <span>🎉</span>
          <span>{claimToast}</span>
        </div>
      )}

      {claimAvailable && (
        <div className="w-full mb-6 bg-white border border-line rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <span className="text-xl shrink-0">💌</span>
          <p className="flex-1 text-xs sm:text-sm text-text-2 leading-relaxed font-medium">
            결제하신 궁합 결과가 있어요. 이 계정에 저장할까요?
          </p>
          <button
            type="button"
            onClick={handleClaimUnlock}
            disabled={isClaiming}
            className="shrink-0 bg-coral text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-coral-deep transition-all active:scale-[0.96] disabled:opacity-60"
          >
            {isClaiming ? "연동 중..." : "연동하기"}
          </button>
        </div>
      )}

      <div className="w-full">
        {/* 1. 인사 영역: 두근이 3D(56px) + {이름}님, 안녕하세요 + 보조문장 */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-14 h-14 relative shrink-0">
            <Image
              src="/mascot/transparent/doogeun_cat_canon.webp"
              alt="두근이"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink">
              {firstName}님, 안녕하세요
            </h1>
            <p className="text-xs sm:text-sm text-caption font-medium mt-0.5">
              오늘은 누구와의 궁합이 궁금하세요?
            </p>
          </div>
        </div>

        {/* 2. 주 행동 카드: 흰 카드 + line 테두리 + 커플 두근이 3D 88px */}
        <div className="rounded-2xl bg-white border border-line p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <span className="inline-block text-[11px] font-black text-coral bg-coral-soft px-2 py-0.5 rounded-md mb-1.5">
                정통 궁합
              </span>
              <h2 className="text-lg font-black tracking-tight text-ink mb-1">
                새 궁합 보기
              </h2>
              <p className="text-xs text-caption leading-relaxed mb-4">
                생년월일로 30초 만에 두 사람의 기운과 다정한 케미를 확인해요
              </p>
              <Link
                href={`/compat/new?productId=compat_basic`}
                onClick={() => handleCardClick("new_compat")}
                className="inline-flex items-center gap-2 bg-coral text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-coral-deep transition-all duration-150 active:scale-[0.96]"
              >
                <span>궁합 시작하기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="w-[88px] h-[88px] relative shrink-0">
              <Image
                src="/mascot/transparent/couple_red_thread.webp"
                alt="두근이 커플"
                width={88}
                height={88}
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* 3. 바로가기 격자 (총운, 보관함, 패스 회원 조건부 주간운세) */}
        <div className={`grid gap-3 mt-4 ${isPassActive ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
          {/* 내 2026 총운 */}
          <Link
            href={`/fortune/annual?year=2026`}
            onClick={() => handleCardClick("annual_2026")}
            className="block group"
          >
            <div className="h-full rounded-2xl bg-white border border-line p-4 shadow-xs hover:bg-surface-soft transition-all duration-150 active:scale-[0.96] flex flex-col justify-between">
              <div className="w-11 h-11 relative mb-2">
                <Image
                  src="/icons3d/annual_2026.webp"
                  alt="2026 총운"
                  width={44}
                  height={44}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-ink group-hover:text-coral transition-colors duration-150">
                  내 2026 총운
                </h3>
                <p className="text-[11px] text-caption font-medium mt-0.5 leading-snug">
                  올해 흐름과 월별로 조심할 때
                </p>
              </div>
            </div>
          </Link>

          {/* 내 보관함 */}
          <Link
            href={`/me`}
            onClick={() => handleCardClick("my_storage")}
            className="block group"
          >
            <div className="h-full rounded-2xl bg-white border border-line p-4 shadow-xs hover:bg-surface-soft transition-all duration-150 active:scale-[0.96] flex flex-col justify-between">
              <div className="w-11 h-11 rounded-xl bg-surface-soft flex items-center justify-center text-plum-deep mb-2 border border-line/60">
                <Calendar className="w-6 h-6 text-plum-deep" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-ink group-hover:text-plum-deep transition-colors duration-150">
                  내 보관함
                </h3>
                <p className="text-[11px] text-caption font-medium mt-0.5 leading-snug">
                  {mineCount > 0 ? `산 리포트 ${mineCount}개` : "아직 없어요"}
                </p>
              </div>
            </div>
          </Link>

          {/* 이번 주 운세 (패스 활성 회원만 3번째 칸 노출) */}
          {isPassActive && (
            <Link
              href={`/fortune/weekly`}
              onClick={() => handleCardClick("weekly_fortune")}
              className="block group"
            >
              <div className="h-full rounded-2xl bg-white border border-line p-4 shadow-xs hover:bg-surface-soft transition-all duration-150 active:scale-[0.96] flex flex-col justify-between">
                <div className="w-11 h-11 rounded-xl bg-surface-soft flex items-center justify-center text-coral mb-2 border border-line/60 text-lg">
                  ✨
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-ink group-hover:text-coral transition-colors duration-150">
                    이번 주 종합 운세
                  </h3>
                  <p className="text-[11px] text-caption font-medium mt-0.5 leading-snug">
                    매주 월요일 주간 흐름
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* 4. 이어서 보면 좋은 리포트 (가로 카드 3개) */}
        {recommendedReports.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-ink mb-3 px-1">이어서 보면 좋은 리포트</h3>
            <div className="space-y-2.5">
              {recommendedReports.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  onClick={() => handleCardClick(`recommended_${item.id}`)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-line hover:bg-surface-soft transition-all duration-150 active:scale-[0.96] group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 relative shrink-0">
                      <Image
                        src={item.icon3d}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors duration-150 truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-caption truncate mt-0.5">
                        {item.hook}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-bold text-coral">
                      {priceLabel(item)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 알림 받기 배너 (알림이 아직 기본값일 때만) */}
        {notifPermission === "default" && (
          <div className="mt-6">
            <div className="flex items-center justify-between rounded-2xl bg-white border border-line p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-soft flex items-center justify-center text-coral flex-shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">운세 & 궁합 알림 받기</p>
                  <p className="text-[11px] text-caption">새로운 운세 소식을 실시간 푸시로 💘</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnableNotif}
                className="bg-coral text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-[0.96] transition-transform duration-150 flex-shrink-0"
              >
                알림 켜기
              </button>
            </div>
          </div>
        )}

        {/* 5. 지난 궁합 기록 (원형 배지, 하트, 5개 초과 시 더 보기) */}
        <div className="mt-6 rounded-2xl bg-white border border-line p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">지난 궁합 기록</h3>
            {historyItems.length > 0 && (
              <span className="text-[11px] text-plum-deep font-semibold bg-surface-soft px-2 py-0.5 rounded-full border border-line">
                {historyItems.length}개
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-caption">궁합 기록을 불러오는 중...</div>
          ) : historyItems.length > 0 ? (
            <>
              <div className="space-y-2.5 mt-3">
                {displayedHistory.map((item) => (
                  <Link
                    key={item.id}
                    href={`/compat/${item.shareToken}`}
                    onClick={() => handleCardClick(`history_${item.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-line hover:bg-surface-soft hover:border-coral/30 transition-all duration-150 active:scale-[0.96] group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-coral flex items-center justify-center text-white font-black text-xs shrink-0 shadow-2xs">
                        {item.score}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-ink group-hover:text-coral transition-colors duration-150 flex items-center gap-1.5 truncate">
                          <span>{item.personA.name}</span>
                          <span className="text-coral text-[11px]">❤️</span>
                          <span>{item.personB.name}</span>
                        </div>
                        <div className="text-[11px] text-caption mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{item.keywords.slice(0, 2).join(" · ")}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-caption group-hover:translate-x-1 group-hover:text-coral transition-all duration-150 shrink-0" />
                  </Link>
                ))}
              </div>

              {historyItems.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="w-full mt-3 py-2 text-center text-xs font-bold text-caption hover:text-coral flex items-center justify-center gap-1 transition-colors duration-150"
                >
                  <span>{showAllHistory ? "접기" : `더 보기 (${historyItems.length - 5}개 더)`}</span>
                  {showAllHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-caption leading-relaxed py-2">
              아직 확인한 궁합이 없어요. 새로운 궁합을 보고 기록을 쌓아보세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
