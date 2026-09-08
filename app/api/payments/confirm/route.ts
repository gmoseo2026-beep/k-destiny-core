// [SECURITY / C-1] 이 라우트는 영구 비활성화되었습니다.
//
// 구(Toss) 승인 플로우 잔재로, PortOne 프로바이더에서는 confirmPayment()가
// "승인"이 아니라 단순 조회(getPayment)로 매핑됩니다. 그럼에도 이 라우트는
// 반환된 status/amount를 검증하지 않고 무조건 status=PAID로 전환해
// 권한을 부여했습니다. 즉 아래가 모두 가능했습니다.
//
//   - READY/FAILED/CANCELLED 상태의 paymentKey 하나로 무한 무료 결제
//   - 요청 본문의 amount 만으로 금액 검증을 통과 (정가는 화면에 노출됨)
//   - CANCELED(환불) 주문의 권한 재부여
//   - applyPaidOrder() 원자 가드 우회 → PERIOD_PASS 이중 연장 race
//
// 정상 경로는 /api/payments/complete 하나뿐입니다.
// (PortOne getPayment 재조회 → status/amount 대조 → applyPaidOrder 원자 부여)
//
// 참고: app/api/checkout/route.ts 의 비활성화 패턴과 동일하게 410으로 응답합니다.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This payment confirmation endpoint is no longer active. Use /api/payments/complete." },
    { status: 410 }
  );
}
