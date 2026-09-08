"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";

function PayCompleteContent() {
  const sp = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "ko";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("결제 상태를 확인하고 있습니다...");

  useEffect(() => {
    const paymentId = sp.get("paymentId");
    const code = sp.get("code"); // 실패 시 PortOne이 code 부여
    const message = sp.get("message");

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

        <p className="text-sm text-[#6A5E72] leading-relaxed mb-8 whitespace-pre-line">
          {msg}
        </p>

        <div className="w-full flex flex-col gap-3">
          {status === "success" && (
            <button
              onClick={() => {
                // 이전 화면(궁합 결과)으로 돌아가거나 홈으로 이동
                if (window.history.length > 2) {
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

          <Link
            href={`/${locale}`}
            className="w-full bg-[#FFF6F1] text-[#6A2C70] border border-[#FFD9E0] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#FFD9E0]/40 transition-all active:scale-95 block text-center"
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
