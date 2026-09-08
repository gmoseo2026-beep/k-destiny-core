// [SECURITY / C-1] 구(Toss) 결제 완료 화면 — 정적 안내로 대체됨.
//
// 이전 구현은 URL 쿼리(paymentKey/orderId/amount)를 그대로 읽어
// /api/payments/confirm 으로 POST 했습니다. 그 라우트가 PG 승인 결과를
// 검증하지 않았기 때문에, 이 화면은 주소창만으로 무료 결제를 트리거할 수 있는
// 공격 진입점이었습니다. 쿼리→POST 경로를 완전히 제거합니다.
//
// 현재 정상 결제 완료 화면은 /[locale]/pay/complete 입니다.
import Link from "next/link";
import KongdakMascot from "@/components/KongdakMascot";

export const dynamic = "force-static";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <KongdakMascot size={100} animate="pulse" expression="flutter" />

      <h1 className="text-2xl font-black text-[#2B2430] mt-6 mb-2">결제 안내</h1>
      <p className="text-[#8A8291] font-medium max-w-md break-keep mb-8">
        더 이상 사용하지 않는 결제 경로입니다.{"\n"}
        결제가 정상 처리되었는지 확인이 필요하시면 고객센터로 문의해주세요.
      </p>

      <Link
        href={`/${locale}`}
        className="bg-[#FF5C77] text-white px-8 py-3.5 rounded-xl font-bold shadow-md active:scale-95 transition-all"
      >
        콩닥 홈으로 가기
      </Link>
    </div>
  );
}
