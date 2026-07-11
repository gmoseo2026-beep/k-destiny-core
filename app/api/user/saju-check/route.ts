import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ── 캐싱 완전 무효화: PC/모바일 동기화 보장 ──
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ hasSajuData: false }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  const profile = await prisma.userSajuProfile.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  return NextResponse.json({ hasSajuData: !!profile }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
