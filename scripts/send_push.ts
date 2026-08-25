import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import webpush from 'web-push';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env fallback if not injected
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('Using DB URL:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
    const isMarketingOnly = args.includes('--non-premium') || args.includes('--marketing');
    
    const subscriptions = await prisma.pushSubscription.findMany({
      where: isMarketingOnly
        ? {
            OR: [
              { userId: null },
              {
                user: {
                  tier: {
                    not: 'PREMIUM',
                  },
                },
              },
            ],
          }
        : undefined,
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
