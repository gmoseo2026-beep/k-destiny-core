import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// ── 캐싱 완전 무효화: PC/모바일 동기화 보장 ──
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PUT /api/user/master
 * 로그인된 사용자의 담당 마스터를 DB에 업데이트합니다.
 * Body: { masterId: number }
 */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { masterId } = body;

    if (typeof masterId !== 'number') {
      return NextResponse.json({ error: 'masterId (number) is required' }, { status: 400 });
    }

    // upsert: 프로필이 없으면 최소한의 데이터로 생성
    await prisma.userSajuProfile.upsert({
      where: { userId: session.user.id },
      update: {
        selectedMasterId: masterId,
      },
      create: {
        userId: session.user.id,
        selectedMasterId: masterId,
        gender: 'Unknown',
        fourPillars: {},
        dayMaster: '',
        elementsScore: {},
      },
    });

    // ── 라우터 캐시 강제 무효화 ──
    revalidatePath('/', 'layout');
    revalidatePath('/[locale]/dashboard', 'page');
    revalidatePath('/[locale]/dashboard/profile', 'page');

    return NextResponse.json({ success: true, masterId }, { status: 200 });
  } catch (error) {
    console.error('[master PUT] DB Error:', error);
    return NextResponse.json({ error: 'Failed to update master' }, { status: 500 });
  }
}
