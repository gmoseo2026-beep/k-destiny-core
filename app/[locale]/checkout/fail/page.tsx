"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import KongdakMascot from "@/components/KongdakMascot";

function CheckoutFailContent({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const message = searchParams.get("message") || "사용자가 결제를 취소했거나 오류가 발생했습니다.";
  const compatId = searchParams.get("compatId");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <KongdakMascot size={100} animate="pulse" expression="hyunta" />
      
      <h1 className="text-2xl font-black text-[#2B2430] mt-6 mb-2">
        결제 실패
      </h1>
      <p className="text-[#8A8291] font-medium max-w-md break-keep mb-8">
        {message}
      </p>

      <button
        onClick={() => {
          if (compatId) {
            router.replace(`/${locale}/compat/${compatId}`);
          } else {
            router.replace(`/${locale}/`);
          }
        }}
        className="bg-[#FF5C77] text-white px-8 py-3.5 rounded-xl font-bold shadow-md active:scale-95 transition-all"
      >
        돌아가기
      </button>
    </div>
  );
}

export default function CheckoutFailPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Loading...</div>}>
      <CheckoutFailContent locale={locale} />
    </Suspense>
  );
}
