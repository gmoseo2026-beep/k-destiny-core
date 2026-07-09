import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/user/saju-profile
 * 로그인된 사용자의 사주 프로필을 DB에서 조회합니다.
 * Cache-Control: no-store 를 적용하여 항상 최신 DB 데이터를 반환합니다.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ profile: null }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  try {
    const profile = await prisma.userSajuProfile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ profile }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('[saju-profile GET] DB Error:', error);
    return NextResponse.json({ profile: null, error: 'DB lookup failed' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }
}

/**
 * POST /api/user/saju-profile
 * 로그인된 사용자의 사주 프로필을 DB에 upsert합니다.
 * 원본 입력 데이터(name, birthYear 등)를 포함합니다.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name, gender, birthYear, birthMonth, birthDay, birthTime,
      unknownTime, country, city,
    } = body;

    if (!gender) {
      return NextResponse.json({ error: 'Gender is required' }, { status: 400 });
    }

    const profile = await prisma.userSajuProfile.upsert({
      where: { userId: session.user.id },
      update: {
        name: name || null,
        gender,
        birthYear: birthYear || null,
        birthMonth: birthMonth || null,
        birthDay: birthDay || null,
        birthTime: birthTime || null,
        unknownTime: unknownTime ?? false,
        country: country || null,
        city: city || null,
      },
      create: {
        userId: session.user.id,
        name: name || null,
        gender,
        birthYear: birthYear || null,
        birthMonth: birthMonth || null,
        birthDay: birthDay || null,
        birthTime: birthTime || null,
        unknownTime: unknownTime ?? false,
        country: country || null,
        city: city || null,
        // fourPillars, dayMaster, elementsScore는 generate-destiny에서 채워짐
        fourPillars: {},
        dayMaster: '',
        elementsScore: {},
      },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('[saju-profile POST] DB Error:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/saju-profile
 * 로그인된 사용자의 사주 프로필을 DB에서 삭제합니다. (사주 리셋)
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.userSajuProfile.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[saju-profile DELETE] DB Error:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
