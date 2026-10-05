"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";
import { rememberUnlockToken, rememberOrderToken, trackPurchase, recallPayReturn } from "@/lib/payments/client";
import { getProduct } from "@/lib/catalog";
import { trackEvent } from "@/lib/gtag";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function PayCompleteContent() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "ko";
  const { data: session } = useSession();
  const isMember = Boolean(session?.user);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("결제 상태를 확인하고 있습니다...");
  // [SECURITY / H-2] 결제한 궁합으로 곧장 돌려보내기 위한 값(서버 응답에서만 받는다).
  const [paidCompatId, setPaidCompatId] = useState<string | null>(null);
  const [paidProductType, setPaidProductType] = useState<string | null>(null);
  const [paidCatalogId, setPaidCatalogId] = useState<string | null>(null);
  // 결제 실패·취소 시 돌아갈 화면(결제를 시작한 곳)
  const [retryHref, setRetryHref] = useState<string | null>(null);
  // 이메일 없이 결제한 비회원(모바일): 결제가 끝난 뒤에 이메일을 선택으로 받는다
  const [emailOrderId, setEmailOrderId] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // 재실행(특히 URL 정리 후) 방지
    ranRef.current = true;

    // sp 대신 마운트 시점의 실제 주소에서 읽는다(정리 전에 확정)
    const url = new URL(window.location.href);
    const paymentId = url.searchParams.get("paymentId");
    const code = url.searchParams.get("code"); // 실패 시 PortOne이 code 부여
    const message = url.searchParams.get("message");

    // [SECURITY / M-10] paymentId(=orderId)는 lib/entitlement.ts 에서 게스트 열람 베어러
    // 토큰으로 쓰이는 값이다. PortOne 리다이렉트가 이 값을 쿼리로 실어 오므로, 값을 읽은 즉시
    // 주소창에서 지워 브라우저 히스토리·이후 SPA page_view 에 남지 않게 한다.
    if (typeof window !== "undefined" && window.location.search) {
      const cleaned = new URL(window.location.href);
      ["paymentId", "orderId", "claimToken", "token", "code", "message"].forEach((k) =>
        cleaned.searchParams.delete(k)
      );
      window.history.replaceState({}, "", cleaned.pathname + cleaned.search + cleaned.hash);
    }

    if (!paymentId) {
      queueMicrotask(() => {
        setStatus("error");
        setMsg("잘못된 접근입니다. (주문 번호가 누락되었습니다)");
      });
      return;
    }

    if (code) {
      queueMicrotask(() => {
        setStatus("error");
        setMsg(message ? `결제 실패: ${message}` : "결제가 취소되었거나 실패했습니다.");
        setRetryHref(recallPayReturn());
      });
      trackEvent("payment_failed", { stage: "pg_return", code: String(code).slice(0, 60) });
      return;
    }

    fetch("/api/payments/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    })
      .then(async (r) => {
        if (r.ok) {
          // [SECURITY / H-2] 게스트는 세션이 없으므로 서버가 확정해 돌려준 orderId 를
          // 이 기기에 보관해야 리포트 열람 시 소유권을 증명할 수 있다.
          const result = await r.json().catch(() => null);
          if (result?.catalogId && result?.orderId) {
            rememberOrderToken(result.catalogId, result.orderId, result.compatId || undefined);
          }
          if (result?.type === "SINGLE" && result?.compatId && result?.orderId) {
            rememberUnlockToken(result.compatId, result.orderId);
            setPaidCompatId(result.compatId);
          }
          if (result?.catalogId) {
            setPaidCatalogId(result.catalogId);
          }
          if (result?.needsEmail && result?.orderId) {
            setEmailOrderId(result.orderId);
          }
          if (result?.productType === "ANNUAL") {
            setPaidProductType("ANNUAL");
          }
          setStatus("success");
          setMsg("결제가 정상적으로 완료되었습니다!");

          if (result?.catalogId) {
            const catItem = getProduct(result.catalogId);
            trackEvent("purchase_confirmed", {
              productId: result.catalogId,
              tier: catItem?.tier || "standard",
              amount: typeof result.amount === "number" ? result.amount : (catItem?.price || 0),
            });
            // 모바일 결제도 GA4 매출(purchase)에 잡히게 한다
            trackPurchase({
              receiptId: result.receiptId,
              amount: typeof result.amount === "number" ? result.amount : (catItem?.price || 0),
              catalogId: result.catalogId,
            });
          }
        } else {
          const e = await r.json().catch(() => ({}));
          setStatus("error");
          setMsg(e.error || "결제 확인에 실패했습니다. 고객센터로 문의해주세요.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMsg("서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      });
  }, []);

  const [copied, setCopied] = useState(false);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrderId || emailState === "saving") return;
    setEmailState("saving");
    try {
      const res = await fetch("/api/payments/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: emailOrderId, email: emailValue.trim() }),
      });
      setEmailState(res.ok ? "saved" : "error");
      if (res.ok) trackEvent("checkout_email_saved", { productId: paidCatalogId || "unknown" });
    } catch {
      setEmailState("error");
    }
  };

  const handleCopyResultLink = async () => {
    if (!paidCompatId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://kongdak.kr";
    const link = `${origin}/${locale}/compat/${paidCompatId}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("링크 복사에 실패했습니다.");
    }
  };

  const handleShareKakaoSelf = () => {
    if (!paidCompatId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://kongdak.kr";
    const link = `${origin}/${locale}/compat/${paidCompatId}`;
    const kakao = typeof window !== "undefined" ? window.Kakao : undefined;

    if (kakao && kakao.isInitialized && kakao.isInitialized() && kakao.Share?.sendDefault) {
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: "콩닥 — 내가 결제한 궁합 리포트 보관함 💌",
          description: "결제 완료된 궁합 결과 링크입니다. 언제든 다시 열어보세요!",
          imageUrl: `${origin}/og-image.png`,
          link: {
            mobileWebUrl: link,
            webUrl: link,
          },
        },
      });
    } else {
      // SDK 미초기화 시 링크 복사로 폴백
      handleCopyResultLink();
    }
  };

  const handleGoToReport = () => {
    if (!paidCatalogId) {
      if (paidProductType === "ANNUAL") {
        router.replace(`/${locale}/fortune/annual`);
      } else if (paidCompatId) {
        router.replace(`/${locale}/compat/${paidCompatId}`);
      } else if (window.history.length > 2) {
        router.back();
      } else {
        router.push(`/${locale}`);
      }
      return;
    }

    if (paidCatalogId === "compat_basic") {
      if (paidCompatId) {
        router.replace(`/${locale}/compat/${paidCompatId}`);
      } else {
        router.replace(`/${locale}`);
      }
    } else if (paidCatalogId.startsWith("annual_")) {
      const year = paidCatalogId.replace("annual_", "");
      router.replace(`/${locale}/fortune/annual?year=${year}`);
    } else {
      const compatQuery = paidCompatId ? `&compat=${paidCompatId}` : "";
      router.replace(`/${locale}/report/new?c=${paidCatalogId}${compatQuery}`);
    }
  };

  let buttonText = "리포트 확인하러 가기";
  if (paidCatalogId?.startsWith("annual_")) {
    const year = paidCatalogId.replace("annual_", "");
    buttonText = `${year} 총운 보러 가기`;
  } else if (paidCatalogId && paidCatalogId !== "compat_basic") {
    buttonText = "리포트 생성하러 가기";
  }

  const callbackTarget =
    paidCatalogId === "compat_basic" && paidCompatId
      ? `/${locale}/compat/${paidCompatId}`
      : paidCatalogId?.startsWith("annual_")
      ? `/${locale}/fortune/annual?year=${paidCatalogId.replace("annual_", "")}`
      : paidCatalogId
      ? `/${locale}/report/new?c=${paidCatalogId}${paidCompatId ? `&compat=${paidCompatId}` : ""}`
      : paidCompatId
      ? `/${locale}/compat/${paidCompatId}`
      : `/${locale}/me`;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full p-8 text-center flex flex-col items-center">
        <div className="mb-6">
          <KongdakMascot
            size={80}
            animate={status === "loading" ? "bounce" : "none"}
            expression={status === "success" ? "simkoong" : status === "error" ? "hyunta" : "flutter"}
          />
        </div>

        <h1 className="text-2xl font-black text-ink mb-3">
          {status === "loading" && "결제 확인 중"}
          {status === "success" && "결제 완료!"}
          {status === "error" && "결제 안내"}
        </h1>

        <p className="text-sm text-text-2 leading-relaxed mb-6 whitespace-pre-line">
          {msg}
        </p>

        {status === "success" && !isMember && paidCompatId && (
          <Card variant="soft" className="w-full p-4 text-left mb-6">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-coral">
              <span>💡</span>
              <span>비회원 결과 보관 안내</span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed mb-3">
              결제한 리포트는 지금 이 브라우저에 보관됐어요. 같은 브라우저에서는 링크로 다시 볼 수 있고, 다른 기기에서도 보려면 아래 &lsquo;가입하고 보관하기&rsquo;를 눌러 주세요.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyResultLink}
                className="flex-1"
              >
                <span>{copied ? "✓ 복사 완료!" : "🔗 링크 복사"}</span>
              </Button>
              <button
                type="button"
                onClick={handleShareKakaoSelf}
                className="flex-1 bg-[#FEE500] text-[#191919] py-2 px-3 rounded-2xl text-xs font-bold shadow-xs hover:bg-[#FDD835] transition-all flex items-center justify-center gap-1.5 active:scale-[0.96] focus-visible:ring-2 ring-coral"
              >
                <span>💬 카톡으로 저장</span>
              </button>
            </div>
          </Card>
        )}

        {status === "success" && !isMember && !paidCompatId && (
          <Card variant="soft" className="w-full p-4 text-left mb-6">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-coral">
              <span>💡</span>
              <span>비회원 결과 보관 안내</span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed">
              결제한 리포트는 지금 이 브라우저에 보관됐어요. 같은 브라우저에서는 홈의 &lsquo;결제한 리포트&rsquo;에서 다시 열 수 있고, 다른 기기에서도 보려면 아래 &lsquo;가입하고 보관하기&rsquo;를 눌러 주세요.
            </p>
          </Card>
        )}

        {status === "success" && emailOrderId && (
          <Card variant="soft" className="w-full p-4 text-left mb-6">
            <p className="mb-1 text-xs font-bold text-ink">영수증·문의용 이메일 (선택)</p>
            {emailState === "saved" ? (
              <p className="text-xs text-text-2">저장했어요. 결제 문의가 있을 때 이 이메일로 확인해 드릴게요.</p>
            ) : (
              <form onSubmit={handleSaveEmail} className="flex items-center gap-2">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="kongdak@example.com"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <Button type="submit" variant="secondary" size="sm" disabled={emailState === "saving" || !emailValue.trim()}>
                  저장
                </Button>
              </form>
            )}
            {emailState === "error" && <p className="mt-1.5 text-[11px] text-red-500">이메일 주소를 확인해 주세요.</p>}
            <p className="mt-1.5 text-[11px] text-text-3">남기지 않아도 리포트는 바로 볼 수 있어요.</p>
          </Card>
        )}

        <div className="w-full flex flex-col gap-3">
          {status === "success" && (
            <Button
              size="lg"
              fullWidth
              onClick={handleGoToReport}
            >
              {buttonText}
            </Button>
          )}

          {/* 회원은 이미 계정에 보관된다 → 가입 안내 대신 보관함으로(2026-10-04: 회원 구매자가 가입 버튼을 눌러 로그인 화면으로 갔다) */}
          {status === "success" && isMember && (
            <Link
              href={`/${locale}/me`}
              className="w-full bg-surface-soft text-ink border border-line py-3 rounded-2xl font-bold text-xs hover:bg-surface transition-all active:scale-[0.96] block text-center"
            >
              내 보관함에서 다시 보기
            </Link>
          )}
          {status === "success" && !isMember && (
            <Link
              href={`/${locale}/login?callbackUrl=${encodeURIComponent(callbackTarget)}`}
              className="w-full bg-surface-soft text-ink border border-line py-3 rounded-2xl font-bold text-xs hover:bg-surface transition-all active:scale-[0.96] block text-center"
            >
              ✨ 가입하고 내 계정에 보관하기
            </Link>
          )}

          {status === "error" && retryHref && (
            <>
              <p className="text-xs text-text-2 leading-relaxed -mt-2 mb-1">
                결제되지 않았어요. 다른 카드나 간편결제로 다시 시도할 수 있어요.
              </p>
              <Link
                href={retryHref}
                onClick={() => trackEvent("payment_retry_click", {})}
                className="w-full bg-coral hover:bg-coral-deep text-white py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.96] block text-center"
              >
                다시 결제하러 가기
              </Link>
            </>
          )}

          <Link
            href={`/${locale}`}
            className="w-full text-text-3 py-2 font-medium text-xs hover:text-ink transition-colors block text-center"
          >
            콩닥 홈으로 가기
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function PayCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center p-8 text-plum">로딩 중...</div>}>
      <PayCompleteContent />
    </Suspense>
  );
}

