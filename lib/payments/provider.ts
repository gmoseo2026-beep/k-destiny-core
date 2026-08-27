import { Order } from "@prisma/client";
import { NextRequest } from "next/server";

export interface PaymentProvider {
  /**
   * 클라이언트 결제창 요청 시 필요한 설정값 반환
   */
  requestPaymentParams(order: Order): any;

  /**
   * 단건 결제 승인 요청 (서버에서 금액 등 대조)
   */
  confirmPayment(params: { paymentKey: string; orderId: string; amount: number }): Promise<any>;

  /**
   * 빌링키(정기결제키) 발급
   */
  issueBillingKey(params: any): Promise<{ billingKey: string; customerKey: string } | null>;

  /**
   * 빌링키를 이용해 실제 결제 청구 (구독 결제 갱신)
   */
  chargeBilling(billingKey: string, order: Order): Promise<any>;

  /**
   * 결제 취소 (환불)
   */
  cancelPayment(paymentKey: string, reason: string, cancelAmount?: number): Promise<any>;

  /**
   * 웹훅 요청 파싱 및 멱등 검증
   */
  verifyWebhook(req: NextRequest): Promise<any>;

  /**
   * 결제 조회 (웹훅 검증용)
   */
  getPayment(paymentKey: string): Promise<any>;
}
