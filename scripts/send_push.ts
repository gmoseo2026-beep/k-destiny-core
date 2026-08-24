import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:help@kongdak.kr';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('Missing VAPID keys in environment variables.');
  process.exit(1);
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

async function sendMarketingPush() {
  const args = process.argv.slice(2);
  const title = args[0] || '콩닥 - 운세 업데이트';
  const body = args[1] || '당신의 오늘 운세를 확인해보세요! 💘';
  const url = args[2] || 'https://kongdak.kr';

  console.log(`Sending Push:\nTitle: ${title}\nBody: ${body}\nURL: ${url}`);

  try {
    // 활성 구독자(PREMIUM 이고 구독 상태인 경우)는 제외해야 하지만, 현재 문서 기준으로
    // "User.tier !== 'PREMIUM' 이거나 userId가 null인 대상 전원"으로 필터링.
    
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        OR: [
          { userId: null }, // 비로그인 사용자
          {
            user: {
              tier: {
                not: 'PREMIUM', // 활성 구독자가 아닌 경우
              },
            },
          },
        ],
      },
    });

    console.log(`Found ${subscriptions.length} target subscriptions.`);

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({
        title,
        body,
        url,
        icon: '/icons/icon-192.png',
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Subscription expired/unsubscribed: ${sub.endpoint}. Deleting from DB.`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error(`Error sending to ${sub.endpoint}:`, err);
        }
        failureCount++;
      }
    }

    console.log(`Push sending complete. Success: ${successCount}, Failures/Removals: ${failureCount}`);
  } catch (error) {
    console.error('Error in sendMarketingPush:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sendMarketingPush();
