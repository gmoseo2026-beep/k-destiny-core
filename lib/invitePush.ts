import webpush from "web-push";
import prisma from "@/lib/prisma";
import { BASE_URL } from "@/lib/seo";

export interface InviteCompletedPushPayload {
  title: string;
  body: string;
  url: string;
  icon: string;
}

export function buildInviteCompletedPushPayload(params: {
  receiverName?: string | null;
  shareToken: string;
  baseUrl?: string;
}): InviteCompletedPushPayload {
  const cleanName =
    typeof params.receiverName === "string" && params.receiverName.trim()
      ? params.receiverName.trim().slice(0, 20)
      : "상대방";
  const siteBase = (params.baseUrl || BASE_URL).replace(/\/$/, "");

  return {
    title: "콩닥 반쪽 초대장 완성",
    body: `${cleanName}님이 반쪽을 채워서 두 분의 궁합이 완성됐어요 💌`,
    url: `${siteBase}/ko/compat/${encodeURIComponent(params.shareToken)}`,
    icon: "/icons/icon-192.png",
  };
}

export interface SendInviteCompletedPushParams {
  creatorId?: string | null;
  receiverName?: string | null;
  shareToken: string;
}

export interface SendInviteCompletedPushResult {
  sentCount: number;
  removedCount: number;
}

/**
 * 반쪽 초대장을 만든 회원이 웹 푸시를 구독해 둔 경우 완성 알림을 보낸다.
 * VAPID 미설정·구독 없음·전송 오류가 발생해도 초대장 완성 흐름은 절대 막지 않는다.
 */
export async function sendInviteCompletedPush(
  params: SendInviteCompletedPushParams
): Promise<SendInviteCompletedPushResult> {
  const { creatorId, receiverName, shareToken } = params;
  if (!creatorId || !shareToken) {
    return { sentCount: 0, removedCount: 0 };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const vapidSubject = process.env.VAPID_SUBJECT?.trim() || "mailto:help@kongdak.kr";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return { sentCount: 0, removedCount: 0 };
  }

  if (!prisma?.pushSubscription?.findMany) {
    return { sentCount: 0, removedCount: 0 };
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: creatorId },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    if (subscriptions.length === 0) {
      return { sentCount: 0, removedCount: 0 };
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify(
      buildInviteCompletedPushPayload({
        receiverName,
        shareToken,
      })
    );

    let sentCount = 0;
    let removedCount = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
            { timeout: 4000 }
          );
          sentCount += 1;
        } catch (err: unknown) {
          const statusCode =
            err && typeof err === "object" && "statusCode" in err
              ? Number((err as { statusCode?: unknown }).statusCode)
              : 0;
          if ((statusCode === 404 || statusCode === 410) && prisma.pushSubscription?.delete) {
            removedCount += 1;
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => null);
          }
        }
      })
    );

    return { sentCount, removedCount };
  } catch {
    console.error("[invitePush] web push send failed");
    return { sentCount: 0, removedCount: 0 };
  }
}
