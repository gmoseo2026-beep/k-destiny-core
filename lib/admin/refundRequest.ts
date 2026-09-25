// 어드민 환불 창 → POST /api/admin/orders/refund 요청 본문. 화면과 라우트 테스트가 같은 함수를 써서
// 필드 이름이 어긋나지 않게 한다(과거 cancelReason 으로 보내 서버가 사유를 못 읽던 버그).
export interface RefundRequestBody {
  orderId: string;
  reason: string;
  cancelAmount?: number;
}

export function buildRefundRequestBody(orderId: string, reason: string, cancelAmount?: number): RefundRequestBody {
  return cancelAmount === undefined ? { orderId, reason: reason.trim() } : { orderId, reason: reason.trim(), cancelAmount };
}
