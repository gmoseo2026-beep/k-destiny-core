"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { getProduct } from "@/lib/catalog";
import { rememberOrderToken } from "@/lib/payments/client";
import KongdakMascot from "@/components/KongdakMascot";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";

interface ReportItem {
  catalogId: string;
  reportId: string | null;
  status: "ANNUAL_ROUTE" | "NOT_STARTED" | "GENERATING" | "READY" | "FAILED";
  createdAt: string | null;
}

interface OrderVaultItem {
  orderId: string;
  catalogId: string;
  compatId: string | null;
  expiresAt: string | null;
  reports: ReportItem[];
}

interface MeClientProps {
  locale: string;
}

export default function MeClient({ locale }: MeClientProps) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderVaultItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let isMounted = true;
    fetch("/api/reports/mine", {
      headers: { "Cache-Control": "no-store" },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("보관함을 불러오지 못했습니다.");
        }
        return res.json();
      })
      .then((data: OrderVaultItem[]) => {
        if (isMounted) {
          setOrders(Array.isArray(data) ? data : []);
          setLoading(false);
        }
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
      <div className="w-full max-w-md py-16 flex flex-col items-center justify-center gap-3 text-plum">
        <KongdakMascot size={64} animate="bounce" expression="flutter" />
        <p className="text-sm font-bold text-[#8A8291]">내 보관함을 열고 있어요...</p>
      </div>
    );
  }

  // 비회원 게스트 상태
  if (!session?.user) {
    return (
      <div className="w-full max-w-md flex flex-col items-center">
        <Card className="w-full mb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-coral-soft mx-auto flex items-center justify-center text-3xl mb-4">
            💌
          </div>
          <h2 className="text-xl font-black text-ink mb-2">내 리포트 보관함</h2>
          <p className="text-sm text-text-2 leading-relaxed mb-6">
            로그인하시면 구매하신 모든 심층 리포트를 여러 기기에서 언제든 다시 열어보실 수 있습니다.
          </p>

          <Link
            href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/me`)}`}
            className="w-full bg-coral hover:bg-coral-deep text-white py-3.5 rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(224,36,90,0.25)] transition-all active:scale-[0.96] block text-center"
          >
            로그인하고 내 보관함 확인하기
          </Link>
        </Card>

        <Card variant="soft" className="w-full p-4 text-left">
          <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-coral">
            <span>💡</span>
            <span>비회원으로 결제하셨나요?</span>
          </div>
          <p className="text-xs text-text-2 leading-relaxed">
            결제 시 입력하신 정보로 로그인하시면, 이전 기기에서 결제하신 리포트가 자동으로 내 계정에 연결됩니다.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      {/* Header Profile Summary */}
      <Card className="w-full mb-6">
        <div className="flex items-center justify-between border-b border-line pb-3.5 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-coral-soft flex items-center justify-center text-coral-deep font-black text-lg">
              {session.user.name?.[0] || "콩"}
            </div>
            <div>
              <h2 className="text-base font-black text-ink">{session.user.name || "회원"} 님의 보관함</h2>
              <p className="text-xs text-caption">{session.user.email}</p>
            </div>
          </div>
          <Tag category="compat">
            회원 혜택 적용중
          </Tag>
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-caption px-1">
          <Link
            href={`/${locale}/onboarding`}
            className="hover:text-coral transition-colors flex items-center gap-1 active:scale-[0.96]"
          >
            <span>내 사주 정보 수정</span>
            <span>&rarr;</span>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="hover:text-ink transition-colors active:scale-[0.96]"
          >
            로그아웃
          </button>
        </div>
      </Card>

      {/* Orders & Reports List */}
      <div className="w-full flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-ink">구매한 리포트 목록</h3>
          <span className="text-xs font-medium text-text-3">총 {orders.length}건</span>
        </div>

        {error && (
          <div className="w-full p-4 rounded-2xl bg-red-50 text-red-600 text-xs text-center border border-red-100">
            {error}
          </div>
        )}

        {orders.length === 0 && !error && (
          <Card className="w-full p-8 text-center flex flex-col items-center">
            <KongdakMascot size={64} animate="none" expression="flutter" />
            <h4 className="text-base font-black text-ink mt-3 mb-1">아직 보관된 리포트가 없어요</h4>
            <p className="text-xs text-text-2 mb-6">
              궁합과 사주를 깊이 있게 풀어낸 심층 리포트를 만나보세요.
            </p>
            <Link
              href={`/${locale}#products`}
              className="bg-coral hover:bg-coral-deep text-white py-3 px-6 rounded-2xl text-xs font-bold transition-all active:scale-[0.96] shadow-xs"
            >
              인기 리포트 둘러보기
            </Link>
          </Card>
        )}

        {orders.map((order) => {
          const parentProduct = getProduct(order.catalogId);
          const dDay = calculateDDay(order.expiresAt);

          return (
            <Card
              key={order.orderId}
              className="w-full flex flex-col gap-3"
            >
              <div className="flex items-start justify-between border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-coral">
                      {parentProduct?.name || order.catalogId}
                    </span>
                    {parentProduct?.type === "SET" && (
                      <Tag category="default">
                        세트 상품
                      </Tag>
                    )}
                  </div>
                  <span className="text-[11px] text-text-3">주문번호: {order.orderId.slice(0, 14)}...</span>
                </div>
                {dDay && (
                  <Badge variant={dDay === "만료됨" ? "default" : "popular"}>
                    {dDay}
                  </Badge>
                )}
              </div>

              {/* Sub reports in this order */}
              <div className="flex flex-col gap-2.5">
                {order.reports.map((rep, idx) => {
                  const subProduct = getProduct(rep.catalogId);
                  const title = subProduct?.name || rep.catalogId;

                  return (
                    <div
                      key={`${order.orderId}-${rep.catalogId}-${idx}`}
                      className="bg-surface-soft rounded-2xl p-3.5 border border-line flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-ink truncate">{title}</span>
                        </div>
                        <p className="text-[11px] text-text-3">
                          {rep.status === "READY"
                            ? "열람 가능"
                            : rep.status === "ANNUAL_ROUTE"
                            ? "신년 총운 바로보기"
                            : rep.status === "GENERATING"
                            ? "생성 중..."
                            : "아직 리포트를 생성하지 않았습니다"}
                        </p>
                      </div>

                      {rep.status === "READY" && rep.reportId ? (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleViewReport(rep.reportId!, rep.catalogId, order.orderId, order.compatId)}
                          className="shrink-0"
                        >
                          리포트 보기
                        </Button>
                      ) : rep.status === "ANNUAL_ROUTE" ? (
                        <Link
                          href={`/${locale}/fortune/annual?year=${rep.catalogId.replace("annual_", "")}`}
                          className="bg-coral hover:bg-coral-deep text-white text-xs font-bold px-4 py-2 rounded-2xl transition-all active:scale-[0.96] shadow-xs shrink-0"
                        >
                          총운 보기
                        </Link>
                      ) : rep.status === "GENERATING" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          onClick={() => handleCreateReport(rep.catalogId, order.orderId, order.compatId)}
                          className="shrink-0"
                        >
                          생성 확인
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          onClick={() => handleCreateReport(rep.catalogId, order.orderId, order.compatId)}
                          className="shrink-0"
                        >
                          리포트 만들기
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

      {/* CTA Button */}
      <Link
        href={`/${locale}#products`}
        className="w-full bg-white hover:bg-surface-soft active:scale-[0.96] text-ink text-center py-3.5 rounded-2xl font-bold text-sm border border-line shadow-xs transition-all flex items-center justify-center gap-2"
      >
        <span>더 많은 운세·궁합 보러가기 ✨</span>
      </Link>
    </div>
  );
}

