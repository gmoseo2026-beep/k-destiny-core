import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const subscription = await req.json();
    const session = await getServerSession(authOptions);

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;

    // Additive upset logic for subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session?.user?.id || null, // Update to logged in user if they subscribed later
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session?.user?.id || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push Subscription Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
