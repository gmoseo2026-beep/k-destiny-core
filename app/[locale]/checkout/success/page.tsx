"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import KongdakMascot from "@/components/KongdakMascot";

function CheckoutSuccessContent({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("결제를 확인하고 있습니다...");

  useEffect(() => {
    let isMounted = true;

    async function processPayment() {
      try {
        const type = searchParams.get("type");
        const compatId = searchParams.get("compatId");
        
        if (type === "SINGLE") {
          const paymentKey = searchParams.get("paymentKey");
          const orderId = searchParams.get("orderId");
          const amount = searchParams.get("amount");

          if (!paymentKey || !orderId || !amount) {
            throw new Error("결제 정보가 누락되었습니다.");
          }

          const res = await fetch("/api/payments/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentKey, orderId, amount }),
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "결제 승인에 실패했습니다.");
          }

          if (isMounted) {
            setStatus("success");
            setMessage("결제가 완료되었습니다! 잠시 후 이동합니다.");
            setTimeout(() => {
              if (compatId) {
                // 게스트의 경우 orderId를 쿼리로 넘겨서 언락을 증명할 수 있게 함
                router.replace(`/${locale}/compat/${compatId}?orderId=${orderId}`);
              } else {
                router.replace(`/${locale}/dashboard`);
              }
            }, 2000);
          }
        } else if (type === "SUBSCRIPTION") {
          const authKey = searchParams.get("authKey");
          const customerKey = searchParams.get("customerKey");

          if (!authKey || !customerKey) {
            throw new Error("구독 인증 정보가 누락되었습니다.");
          }

          const res = await fetch("/api/subscriptions/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authKey, customerKey }),
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "구독 활성화에 실패했습니다.");
          }

          if (isMounted) {
            setStatus("success");
            setMessage("무제한 구독이 활성화되었습니다! 잠시 후 이동합니다.");
            setTimeout(() => {
              if (compatId) {
                router.replace(`/${locale}/compat/${compatId}`);
              } else {
                router.replace(`/${locale}/dashboard`);
              }
            }, 2000);
          }
        } else {
          throw new Error("유효하지 않은 결제 유형입니다.");
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus("error");
          setMessage(err.message || "오류가 발생했습니다.");
        }
      }
    }

    processPayment();

    return () => {
      isMounted = false;
    };
  }, [searchParams, router, locale]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {status === "loading" && <KongdakMascot size={100} animate="bounce" expression="flutter" />}
      {status === "success" && <KongdakMascot size={100} animate="heartbeat" expression="simkoong" />}
      {status === "error" && <KongdakMascot size={100} animate="pulse" expression="cringe" />}
      
      <h1 className="text-2xl font-black text-[#2B2430] mt-6 mb-2">
        {status === "loading" && "결제 확인 중"}
        {status === "success" && "결제 완료!"}
        {status === "error" && "결제 실패"}
      </h1>
      <p className="text-[#8A8291] font-medium max-w-md break-keep">
        {message}
      </p>

      {status === "error" && (
        <button
          onClick={() => {
            const compatId = searchParams.get("compatId");
            if (compatId) {
              router.replace(`/${locale}/compat/${compatId}`);
            } else {
              router.replace(`/${locale}/`);
            }
          }}
          className="mt-8 bg-[#FF5C77] text-white px-6 py-3 rounded-xl font-bold shadow-md active:scale-95"
        >
          돌아가기
        </button>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Loading...</div>}>
      <CheckoutSuccessContent locale={locale} />
    </Suspense>
  );
}
