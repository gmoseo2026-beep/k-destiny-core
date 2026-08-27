import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { calculateFourPillars } from "@/lib/saju";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, gender, birthYear, birthMonth, birthDay, birthTime, unknownTime, country, city } = body;

    if (!name || !gender || !birthYear || !birthMonth || !birthDay) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const dateStr = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
    const timeStr = unknownTime ? null : birthTime;
    const location = `${city || 'Seoul'}, ${country || 'Korea'}`;

    const sajuResult = calculateFourPillars(dateStr, timeStr, gender, location);

    // birthHash can be simple hash or just string for now (as it is PII protection, hashing is better, but this is MVP)
    const birthHash = Buffer.from(`${dateStr}-${timeStr}-${gender}`).toString('base64');

    const profile = await prisma.userSajuProfile.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        name,
        gender,
        birthYear,
        birthMonth,
        birthDay,
        birthTime: timeStr,
        unknownTime,
        country,
        city,
        fourPillars: sajuResult.fourPillars,
        dayMaster: sajuResult.dayMasterSignKey,
        elementsScore: sajuResult.elementsScore,
        birthHash
      },
      create: {
        userId: session.user.id,
        name,
        gender,
        birthYear,
        birthMonth,
        birthDay,
        birthTime: timeStr,
        unknownTime,
        country,
        city,
        fourPillars: sajuResult.fourPillars,
        dayMaster: sajuResult.dayMasterSignKey,
        elementsScore: sajuResult.elementsScore,
        birthHash
      }
    });

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error("Profile saving error:", error);
    return NextResponse.json({ error: error.message || "Failed to save profile" }, { status: 500 });
  }
}
