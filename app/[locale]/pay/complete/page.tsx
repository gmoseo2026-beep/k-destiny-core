"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";
import { rememberUnlockToken } from "@/lib/payments/client";

function PayCompleteContent() {
  const sp = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "ko";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("결제 상태를 확인하고 있습니다...");
  // [SECURITY / H-2] 결제한 궁합으로 곧장 돌려보내기 위한 값(서버 응답에서만 받는다).
  const [paidCompatId, setPaidCompatId] = useState<string | null>(null);

  useEffect(() => {
    const paymentId = sp.get("paymentId");
    const code = sp.get("code"); // 실패 시 PortOne이 code 부여
    const message = sp.get("message");

    // [SECURITY / M-10] paymentId(=orderId)는 lib/entitlement.ts 에서 게스트 열람 베어러
    // 토큰으로 쓰이는 값이다. PortOne 리다이렉트가 이 값을 쿼리로 실어 오므로, 값을 읽은 즉시
    // 주소창에서 지워 브라우저 히스토리·이후 SPA page_view 에 남지 않게 한다.
    // (GA4 최초 page_view 쪽은 components/Analytics.tsx 의 page_location 정제가 함께 막는다)
    if (typeof window !== "undefined" && window.location.search) {
      const cleaned = new URL(window.location.href);
      ["paymentId", "orderId", "claimToken", "token"].forEach((k) =>
        cleaned.searchParams.delete(k)
      );
      window.history.replaceState({}, "", cleaned.pathname + cleaned.search + cleaned.hash);
    }

    if (!paymentId) {
      setStatus("error");
      setMsg("잘못된 접근입니다. (주문 번호가 누락되었습니다)");
      return;
    }

    if (code) {
      setStatus("error");
      setMsg(message ? `결제 실패: ${message}` : "결제가 취소되었거나 실패했습니다.");
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
          if (result?.type === "SINGLE" && result?.compatId && result?.orderId) {
            rememberUnlockToken(result.compatId, result.orderId);
            setPaidCompatId(result.compatId);
          }
          setStatus("success");
          setMsg("결제가 정상적으로 완료되었습니다!");
        } else {
          const e = await r.json();
          setStatus("error");
          setMsg(e.error || "결제 확인에 실패했습니다. 고객센터로 문의해주세요.");
        }
      })
      .catch((err) => {
        setStatus("error");
        setMsg("서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      });
  }, [sp]);

  const [copied, setCopied] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#FFF6F1] flex items-center justify-center px-4 py-12">
      <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-md border border-[#FFD9E0]/60 text-center flex flex-col items-center">
        <div className="mb-6">
          <KongdakMascot
            size={80}
            animate={status === "loading" ? "bounce" : "none"}
            expression={status === "success" ? "simkoong" : status === "error" ? "hyunta" : "flutter"}
          />
        </div>

        <h1 className="text-2xl font-black text-[#2B2430] mb-3">
          {status === "loading" && "결제 확인 중"}
          {status === "success" && "결제 완료!"}
          {status === "error" && "결제 안내"}
        </h1>

        <p className="text-sm text-[#6A5E72] leading-relaxed mb-6 whitespace-pre-line">
          {msg}
        </p>

        {status === "success" && paidCompatId && (
          <div className="w-full bg-[#FFF0F3] border border-[#FFD9E0] rounded-2xl p-4 text-left mb-6">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-[#FF5C77]">
              <span>💡</span>
              <span>비회원 결과 보관 안내</span>
            </div>
            <p className="text-xs text-[#6A5E72] leading-relaxed mb-3">
              현재 브라우저에 열람 권한이 자동 저장되었습니다. 링크를 잃어버리거나 다른 기기에서 보시려면 링크를 꼭 보관해 두세요!
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyResultLink}
                className="flex-1 bg-white border border-[#FFD9E0] text-[#6A2C70] py-2 px-3 rounded-xl text-xs font-bold shadow-sm hover:bg-[#FFF6F1] transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>{copied ? "✓ 복사 완료!" : "🔗 링크 복사"}</span>
              </button>
              <button
                type="button"
                onClick={handleShareKakaoSelf}
                className="flex-1 bg-[#FEE500] text-[#191919] py-2 px-3 rounded-xl text-xs font-bold shadow-sm hover:bg-[#FDD835] transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>💬 카톡으로 저장</span>
              </button>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          {status === "success" && (
            <button
              onClick={() => {
                // 결제한 궁합 결과로 직접 이동한다.
                if (paidCompatId) {
                  router.replace(`/${locale}/compat/${paidCompatId}`);
                } else if (window.history.length > 2) {
                  router.back();
                } else {
                  router.push(`/${locale}`);
                }
              }}
              className="w-full bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white py-3.5 rounded-2xl font-bold text-sm shadow-md hover:opacity-95 transition-all active:scale-95"
            >
              리포트 확인하러 가기
            </button>
          )}

          {status === "success" && paidCompatId && (
            <Link
              href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/compat/${paidCompatId}`)}`}
              className="w-full bg-[#FFF6F1] text-[#6A2C70] border border-[#FFD9E0] py-3 rounded-2xl font-bold text-xs hover:bg-[#FFD9E0]/40 transition-all active:scale-95 block text-center"
            >
              ✨ 가입하고 내 계정에 평생 보관하기
            </Link>
          )}

          <Link
            href={`/${locale}`}
            className="w-full text-[#8A8291] py-2 font-medium text-xs hover:text-[#6A2C70] transition-colors block text-center"
          >
            콩닥 홈으로 가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PayCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF6F1] flex items-center justify-center p-8 text-[#6A2C70]">로딩 중...</div>}>
      <PayCompleteContent />
    </Suspense>
  );
}
