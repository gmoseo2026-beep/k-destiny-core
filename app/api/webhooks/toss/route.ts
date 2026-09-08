// [SECURITY / H-3] 이 웹훅은 영구 비활성화되었습니다.
//
// 이전 구현에는 서명검증이 전혀 없었습니다(tossProvider.verifyWebhook 은
// 요청 본문을 그대로 반환할 뿐입니다). 누구나 POST 할 수 있는 상태에서
// 권한부여/회수 로직에 직접 도달했고, 현재 PortOne 프로바이더에서
// 응답 필드명이 달라(getPayment → id/amount.total) 우연히 400으로 막히고
// 있을 뿐이었습니다. PG_PROVIDER 롤백이나 필드명 변경 한 번이면
// 무인증 권한부여 엔드포인트가 됩니다.
//
// 현재 정상 웹훅은 /api/webhooks/portone 하나뿐입니다.
// (@portone/server-sdk Webhook.verify 서명검증 → getPayment 재조회 →
//  status/amount 대조 → applyPaidOrder / revokePaidOrder)
//
// Toss 부활 시: 이 파일을 되살리지 말고, portone 라우트와 동일한
// [서명검증 → PG 재조회 → 금액대조 → 원자적 부여] 순서로 새로 작성할 것.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This webhook endpoint is no longer active." },
    { status: 410 }
  );
}
