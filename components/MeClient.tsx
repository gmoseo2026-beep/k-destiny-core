"use client";

import OwnedReportNotice from "@/components/OwnedReportNotice";
import ResumeCard from "@/components/member/ResumeCard";
import MarketingConsentToggle from "@/components/member/MarketingConsentToggle";
import DailyFortuneCard from "@/components/member/DailyFortuneCard";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Ticket, ArrowRight } from "lucide-react";
import { getProduct, getProductCover } from "@/lib/catalog";
import { rememberOrderToken } from "@/lib/payments/client";
import { collectDeviceOrderTokens, recallDeviceCoupon } from "@/lib/couponsClient";
import KongdakMascot from "@/components/KongdakMascot";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";

interface ReportItem {
  catalogId: string;
  reportId: string | null;
  status: "ANNUAL_ROUTE" | "COMPAT_ROUTE" | "NOT_STARTED" | "GENERATING" | "READY" | "FAILED";
  compatId?: string | null;
  createdAt: string | null;
}

interface OrderVaultItem {
  orderId: string;
  catalogId: string;
  compatId: string | null;
  expiresAt: string | null;
  reports: ReportItem[];
}

interface CompatHistoryItem {
  id: string;
  shareToken: string;
  score: number;
  keywords: string[];
  createdAt: string;
  personA: { name: string };
  personB: { name: string };
}

interface MeClientProps {
  locale: string;
}

export default function MeClient({ locale }: MeClientProps) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderVaultItem[]>([]);
  const [historyItems, setHistoryItems] = useState<CompatHistoryItem[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<{
    code: string;
    amount: number;
    expiresAt?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const saved = recallDeviceCoupon();
    const guestOrderTokens = collectDeviceOrderTokens();
    fetch("/api/coupons/available", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(saved ? { couponCode: saved.code } : {}),
        ...(guestOrderTokens.length > 0 ? { guestOrderTokens } : {}),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { coupon?: { code: string; amount: number; expiresAt?: string } | null } | null) => {
        if (!alive) return;
        setActiveCoupon(d?.coupon ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let isMounted = true;
    Promise.all([
      fetch("/api/reports/mine", { headers: { "Cache-Control": "no-store" } }).then((res) =>
        res.ok ? res.json() : [],
      ),
      fetch("/api/compat").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([mineData, compatData]) => {
        if (!isMounted) return;
        setOrders(Array.isArray(mineData) ? mineData : []);
        if (Array.isArray(compatData?.items)) {
          setHistoryItems(compatData.items);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "오류가 발생했습니다.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session, authStatus]);

  const [now] = useState(() => Date.now());

  const calculateDDay = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "만료됨";
    if (diffDays === 0) return "오늘 만료";
    return `D-${diffDays}`;
  };

  const handleCreateReport = (itemCatalogId: string, orderId: string, compatId: string | null) => {
    rememberOrderToken(itemCatalogId, orderId, compatId || undefined);
    const compatQuery = compatId ? `&compat=${compatId}` : "";
    router.push(`/${locale}/report/new?c=${itemCatalogId}${compatQuery}`);
  };

  const handleViewReport = (reportId: string, itemCatalogId: string, orderId: string, compatId: string | null) => {
    rememberOrderToken(itemCatalogId, orderId, compatId || undefined);
    router.push(`/${locale}/report/${reportId}`);
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="w-full max-w-md py-16 flex flex-col items-center justify-center gap-3">
        <KongdakMascot size={64} animate="bounce" expression="flutter" />
        <p className="text-sm font-bold text-[#B9A9BF]">내 보관함을 열고 있어요...</p>
      </div>
    );
  }

  // 비회원 게스트 상태
  if (!session?.user) {
    return (
      <div className="w-full max-w-md flex flex-col items-center">
        <OwnedReportNotice locale={locale} source="me" className="mb-5 w-full" />
        <ResumeCard locale={locale} source="me" className="mb-5 w-full" />

        {/* 비회원 내 쿠폰함 */}
        <section id="coupons" className="w-full mb-5 scroll-mt-20">
          <Card className="w-full p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-[#FFC24B]" />
                <h3 className="text-sm font-extrabold text-[#F6EEF3]">내 쿠폰함</h3>
              </div>
              <span className="text-xs font-extrabold text-[#FFC24B]">
                {activeCoupon ? "사용 가능 1장" : "0장"}
              </span>
            </div>
            {activeCoupon ? (
              <div className="mt-3 rounded-xl border border-[#FFC24B]/35 bg-[#140B18] p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#F6EEF3]">다음 구매 할인 쿠폰</p>
                  <p className="text-[11px] text-[#B9A9BF] mt-0.5">결제 창에서 자동으로 적용돼요</p>
                </div>
                <span className="text-sm font-extrabold text-[#FFC24B]">
                  {activeCoupon.amount.toLocaleString("ko-KR")}원
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#B9A9BF]">
                리포트를 읽고 후기를 남기면 다음 구매 1,000원 할인 쿠폰을 드려요.
              </p>
            )}
          </Card>
        </section>

        <Card className="w-full mb-5 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <KongdakMascot size={56} animate="none" expression="flutter" />
          </div>
          <h2 className="text-xl font-black text-[#F6EEF3] mb-2">내 리포트 보관함</h2>
          <p className="text-sm text-[#B9A9BF] leading-relaxed mb-6">
            로그인하시면 구매하신 모든 심층 리포트를 여러 기기에서 언제든 다시 열어보실 수 있어요.
          </p>

          <Link
            href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/me`)}`}
            className="w-full bg-[#FF5C77] hover:bg-[#E0245A] text-white py-3.5 rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(255,92,119,0.28)] transition-all active:scale-[0.96] block text-center"
          >
            3초만에 로그인하고 보관함 열기
          </Link>
        </Card>

        <Card variant="soft" className="w-full p-4 text-left">
          <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-[#FFC24B]">
            <span>💡</span>
            <span>비회원으로 결제하셨나요?</span>
          </div>
          <p className="text-xs text-[#B9A9BF] leading-relaxed">
            결제한 이 화면(브라우저)에서 가입·로그인하면 결제한 리포트가 자동으로 내 계정에 옮겨져, 다른 기기에서도 볼 수 있어요.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      {/* 1. 내 정보 카드 */}
      <Card className="w-full mb-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#FF5C77]/20 border border-[#FF5C77]/35 flex items-center justify-center text-[#FF8AA1] font-black text-base">
              {session.user.name?.[0] || "콩"}
            </div>
            <div>
              <h1 className="text-base font-black text-[#F6EEF3]">
                {session.user.name || "회원"} 님의 보관함
              </h1>
              <p className="text-xs text-[#B9A9BF]">{session.user.email}</p>
            </div>
          </div>
          <Tag category="compat">회원</Tag>
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-[#B9A9BF] px-1">
          <Link
            href={`/${locale}/onboarding`}
            className="hover:text-[#FF5C77] transition-colors flex items-center gap-1 active:scale-[0.96]"
          >
            <span>내 사주 정보 수정</span>
            <span>&rarr;</span>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="hover:text-[#F6EEF3] transition-colors active:scale-[0.96]"
          >
            로그아웃
          </button>
        </div>
        <MarketingConsentToggle />
      </Card>

      {/* 2. 내 쿠폰함 */}
      <section id="coupons" className="w-full mb-5 scroll-mt-20">
        <Card className="w-full p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-[#FFC24B]" />
              <h2 className="text-sm font-extrabold text-[#F6EEF3]">내 쿠폰함</h2>
            </div>
            <span className="text-xs font-extrabold text-[#FFC24B]">
              {activeCoupon ? "사용 가능 1장" : "0장"}
            </span>
          </div>
          {activeCoupon ? (
            <div className="mt-3 rounded-xl border border-[#FFC24B]/35 bg-[#140B18] p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#F6EEF3]">할인 쿠폰 ({activeCoupon.code})</p>
                <p className="text-[11px] text-[#B9A9BF] mt-0.5">다음 결제 시 자동으로 적용돼요</p>
              </div>
              <span className="text-sm font-extrabold text-[#FFC24B]">
                -{activeCoupon.amount.toLocaleString("ko-KR")}원
              </span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#B9A9BF]">
              구매한 리포트 하단에서 후기를 남기면 1,000원 할인 쿠폰이 즉시 발급돼요.
            </p>
          )}
        </Card>
      </section>

      {/* 오늘의 운세 */}
      <div className="w-full mb-5">
        <DailyFortuneCard isPassActive={false} />
      </div>

      {/* 이어보기 */}
      <ResumeCard locale={locale} source="me" className="mb-5 w-full" />

      {/* 3. 구매한 리포트 목록 (표지 정사각 썸네일 적용) */}
      <div className="w-full flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-[#F6EEF3]">구매한 리포트 목록</h2>
          <span className="text-xs font-medium text-[#B9A9BF]">총 {orders.length}건</span>
        </div>

        {error && (
          <div className="w-full p-4 rounded-2xl bg-red-950/50 text-red-300 text-xs text-center border border-red-500/30">
            {error}
          </div>
        )}

        {orders.length === 0 && !error && (
          <Card className="w-full p-8 text-center flex flex-col items-center">
            <KongdakMascot size={64} animate="none" expression="flutter" />
            <h3 className="text-base font-black text-[#F6EEF3] mt-3 mb-1">
              아직 보관된 리포트가 없어요
            </h3>
            <p className="text-xs text-[#B9A9BF] mb-6">
              궁합과 사주를 깊이 있게 풀어낸 심층 리포트를 만나보세요.
            </p>
            <Link
              href={`/${locale}/products`}
              className="bg-[#FF5C77] hover:bg-[#E0245A] text-white py-3 px-6 rounded-2xl text-xs font-bold transition-all active:scale-[0.96]"
            >
              전체 운세·궁합 둘러보기
            </Link>
            {/* 10-29: 틱톡 안에서 비회원 결제 → 다른 곳에서 가입한 손님이 "결제한 게 안 보인다"고 항의 */}
            <p className="mt-5 text-[11px] leading-relaxed text-[#B9A9BF]">
              비회원으로 결제하셨다면, 결제했던 앱(틱톡·인스타 등) 화면에서 로그인하면 자동으로 옮겨져요.
              그래도 안 보이면 help@kongdak.kr 로 결제 시각을 알려 주세요. 바로 옮겨 드릴게요.
            </p>
          </Card>
        )}

        {orders.map((order) => {
          const parentProduct = getProduct(order.catalogId);
          const dDay = calculateDDay(order.expiresAt);

          return (
            <Card key={order.orderId} className="w-full flex flex-col gap-3">
              <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#FFC24B]">
                      {parentProduct?.name || order.catalogId}
                    </span>
                    {parentProduct?.type === "SET" && (
                      <Tag category="default">세트 상품</Tag>
                    )}
                  </div>
                  <span className="text-[11px] text-[#B9A9BF]">
                    주문번호: {order.orderId.slice(0, 14)}...
                  </span>
                </div>
                {dDay && (
                  <Badge variant={dDay === "만료됨" ? "default" : "popular"}>
                    {dDay}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {order.reports.map((rep, idx) => {
                  const subProduct = getProduct(rep.catalogId);
                  const title = subProduct?.name || rep.catalogId;
                  const coverSrc = getProductCover(subProduct ?? rep.catalogId);

                  return (
                    <div
                      key={`${order.orderId}-${rep.catalogId}-${idx}`}
                      className="bg-[#140B18] rounded-2xl p-3 border border-white/[0.08] flex items-center justify-between gap-3"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#22142A]">
                        <Image
                          src={coverSrc}
                          alt={title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-[#F6EEF3] truncate">
                          {title}
                        </span>
                        <p className="text-[11px] text-[#B9A9BF] mt-0.5">
                          {rep.status === "READY"
                            ? "열람 가능"
                            : rep.status === "ANNUAL_ROUTE"
                            ? "신년 총운 바로보기"
                            : rep.status === "COMPAT_ROUTE"
                            ? "궁합 결과 화면에서 보기"
                            : rep.status === "GENERATING"
                            ? "생성 중..."
                            : "아직 리포트를 생성하지 않았어요"}
                        </p>
                      </div>

                      {rep.status === "READY" && rep.reportId ? (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() =>
                            handleViewReport(rep.reportId!, rep.catalogId, order.orderId, order.compatId)
                          }
                          className="shrink-0"
                        >
                          리포트 보기
                        </Button>
                      ) : rep.status === "ANNUAL_ROUTE" ? (
                        <Link
                          href={`/${locale}/fortune/annual?year=${rep.catalogId.replace("annual_", "")}`}
                          className="bg-[#FF5C77] hover:bg-[#E0245A] text-white text-xs font-bold px-3.5 py-2 rounded-2xl transition-all active:scale-[0.96] shrink-0"
                        >
                          총운 보기
                        </Link>
                      ) : rep.status === "COMPAT_ROUTE" ? (
                        <Link
                          href={`/${locale}/compat/${rep.compatId || order.compatId || ""}`}
                          className="bg-[#FF5C77] hover:bg-[#E0245A] text-white text-xs font-bold px-3.5 py-2 rounded-2xl transition-all active:scale-[0.96] shrink-0"
                        >
                          궁합 보기
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          onClick={() =>
                            handleCreateReport(rep.catalogId, order.orderId, order.compatId)
                          }
                          className="shrink-0"
                        >
                          {rep.status === "GENERATING" ? "생성 확인" : "리포트 만들기"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 4. 지난 무료 궁합 기록 */}
      {historyItems.length > 0 && (
        <div className="w-full mb-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-sm font-extrabold text-[#F6EEF3]">지난 궁합 기록</h2>
            <span className="text-xs text-[#B9A9BF]">{historyItems.length}건</span>
          </div>
          <div className="space-y-2.5">
            {historyItems.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/${locale}/compat/${item.shareToken}`}
                className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#22142A] p-3.5 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5C77]/20 text-xs font-extrabold text-[#FF5C77]">
                    {item.score}점
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[#F6EEF3]">
                      {item.personA.name} ❤️ {item.personB.name}
                    </div>
                    <div className="truncate text-[11px] text-[#B9A9BF] mt-0.5">
                      {item.keywords.slice(0, 2).join(" · ")}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#B9A9BF]" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA Button */}
      <Link
        href={`/${locale}/products`}
        className="w-full bg-[#22142A] hover:border-white/20 active:scale-[0.96] text-[#F6EEF3] text-center py-3.5 rounded-2xl font-bold text-sm border border-white/[0.08] transition-all flex items-center justify-center gap-2"
      >
        <span>전체 운세·궁합 둘러보기 ✨</span>
      </Link>
    </div>
  );
}
