import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { calculateFourPillars } from "@/lib/saju";
import { calculateCompatibility } from "@/lib/compatibility";
import prisma from "@/lib/prisma";
import { getClientIp, checkChatRateLimit } from "@/lib/rateLimiter";

// 생년월일(YYYY-MM-DD) 유효성 및 미래 날짜 검증
function isValidDateString(dob: unknown): boolean {
  if (typeof dob !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [yearStr, monthStr, dayStr] = dob.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date > todayUTC) {
    return false; // 미래 날짜 거부
  }

  return true;
}

// 시간(HH:mm) 유효성 검증 (선택값)
function isValidTimeString(time: unknown): boolean {
  if (time === null || time === undefined || time === "") return true;
  if (typeof time !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

const ALLOWED_RELATIONS = new Set(["love", "crush", "friend"]);

// PII 단방향 해시 생성 (비밀 pepper 필수 — 미설정 시 fail-closed)
function createBirthHash(dob: string, time: string | null | undefined, gender: string): string {
  const pepper = process.env.BIRTH_HASH_PEPPER;
  if (!pepper) {
    throw new Error("BIRTH_HASH_PEPPER 미설정 — PII 단방향 해시를 안전하게 생성할 수 없습니다.");
  }
  return crypto.createHash("sha256").update(`${dob}_${time || "none"}_${gender}_${pepper}`).digest("hex");
}

// 24자 이상의 암호학적 난수 shareToken 생성 (URL-safe, 예측/열거 불가능)
function generateSecureShareToken(): string {
  return crypto.randomBytes(18).toString("base64url");
}

/**
 * POST /api/compat
 * 두 사람의 정보를 바탕으로 궁합을 계산하고, PII를 단방향 해시화하여 레코드를 생성합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personA, personB, relation = "love", ref } = body;

    // 1. 필수 필드 및 생년월일 유효성 엄격 검증
    if (!isValidDateString(personA?.dob) || !isValidDateString(personB?.dob)) {
      return NextResponse.json(
        { error: "올바른 생년월일(1900년 이후 및 현재 이전의 유효한 날짜)을 입력해주세요." },
        { status: 400 }
      );
    }

    if (
      (personA?.gender !== "M" && personA?.gender !== "F") ||
      (personB?.gender !== "M" && personB?.gender !== "F")
    ) {
      return NextResponse.json(
        { error: "성별은 'M' 또는 'F'여야 합니다." },
        { status: 400 }
      );
    }

    if (!isValidTimeString(personA?.time) || !isValidTimeString(personB?.time)) {
      return NextResponse.json(
        { error: "출생 시간은 HH:mm 형식이어야 합니다." },
        { status: 400 }
      );
    }

    const safeRelation = typeof relation === "string" && ALLOWED_RELATIONS.has(relation) ? relation : "love";

    // Rate Limiting (IP 기반)
    const clientIp = getClientIp(req);
    const rateCheck = await checkChatRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }

    // 1. 결정론적 사주 명식 계산 (lib/saju.ts 원본 함수 재활용)
    const sajuA = calculateFourPillars(personA.dob, personA.time || null, personA.gender, personA.location || "Seoul, KR");
    const sajuB = calculateFourPillars(personB.dob, personB.time || null, personB.gender, personB.location || "Seoul, KR");

    // 2. 결정론적 궁합 계산 (lib/compatibility.ts)
    const compatResult = calculateCompatibility(sajuA, sajuB);

    // 3. PII 단방향 해시화 (원본 생년월일시는 DB에 저장하지 않음)
    const birthHashA = createBirthHash(personA.dob, personA.time, personA.gender);
    const birthHashB = createBirthHash(personB.dob, personB.time, personB.gender);

    // 저장용 최소 객체 (서버 내부용: 사주 해석 등에 필요한 최소 데이터)
    const safePersonA = {
      name: personA.name ? String(personA.name).slice(0, 20) : "나",
      gender: personA.gender,
      birthHash: birthHashA,
      dayMaster: sajuA.dayMaster,
      elementsScore: sajuA.elementsScore,
      fourPillars: sajuA.fourPillars,
    };

    const safePersonB = {
      name: personB.name ? String(personB.name).slice(0, 20) : "상대방",
      gender: personB.gender,
      birthHash: birthHashB,
      dayMaster: sajuB.dayMaster,
      elementsScore: sajuB.elementsScore,
      fourPillars: sajuB.fourPillars,
    };

    // 4. 유입 경로(K 측정용) sourceCompatId 추적
    let sourceCompatId: string | null = null;
    if (ref && typeof ref === "string") {
      const sourceCompat = await prisma.compatibility.findUnique({
        where: { shareToken: ref },
        select: { id: true },
      });
      if (sourceCompat) {
        sourceCompatId = sourceCompat.id;
      }
    }

    // 5. 예측 불가능한 암호학적 난수 shareToken 발급
    const shareToken = generateSecureShareToken();

    // 6. DB 저장 (PII 평문 저장 없음)
    const compat = await prisma.compatibility.create({
      data: {
        personA: safePersonA,
        personB: safePersonB,
        relation: safeRelation,
        score: compatResult.score,
        keywords: compatResult.keywords,
        breakdown: compatResult.breakdown,
        shareToken,
        sourceCompatId,
      },
    });

    return NextResponse.json({
      id: compat.id,
      shareToken: compat.shareToken,
      score: compat.score,
      keywords: compat.keywords,
      personA: { name: safePersonA.name, gender: safePersonA.gender },
      personB: { name: safePersonB.name, gender: safePersonB.gender },
    });
  } catch (error) {
    // 보안: 생년월일 등 PII가 에러 로그에 남지 않도록 에러 메시지만 안전하게 기록
    console.error("[compat POST] 궁합 생성 중 오류 발생:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "궁합 계산 중 오류가 발생했습니다." }, { status: 500 });
  }
}

/**
 * GET /api/compat?shareToken=...
 * shareToken으로 궁합 결과를 안전하게 조회합니다. (ID 열거 불가 및 PII/원자료 역산 필드 클라이언트 반환 차단)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get("shareToken");
    const id = searchParams.get("id");

    if (!shareToken && !id) {
      return NextResponse.json({ error: "shareToken 또는 id가 필요합니다." }, { status: 400 });
    }

    const compat = await prisma.compatibility.findUnique({
      where: shareToken ? { shareToken } : { id: id! },
      select: {
        id: true,
        shareToken: true,
        relation: true,
        score: true,
        keywords: true,
        summaryKo: true,
        premiumKo: true,
        isPaid: true,
        createdAt: true,
        personA: true,
        personB: true,
      },
    });

    if (!compat) {
      return NextResponse.json({ error: "궁합 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    const pA = (compat.personA as { name?: string; gender?: string } | null) || {};
    const pB = (compat.personB as { name?: string; gender?: string } | null) || {};

    // 프라이버시 보호: 클라이언트에는 birthHash, fourPillars, elementsScore 등 역산 가능 필드를 일체 제외하고 안전한 표시 필드만 반환
    const safeResponse = {
      id: compat.id,
      shareToken: compat.shareToken,
      relation: compat.relation,
      score: compat.score,
      keywords: compat.keywords,
      summaryKo: compat.summaryKo,
      premiumKo: compat.isPaid ? compat.premiumKo : null,
      isPaid: compat.isPaid,
      createdAt: compat.createdAt,
      personA: {
        name: pA.name || "나",
        gender: pA.gender || "M",
      },
      personB: {
        name: pB.name || "상대방",
        gender: pB.gender || "F",
      },
    };

    return NextResponse.json(safeResponse);
  } catch (error) {
    console.error("[compat GET] 조회 오류:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "궁합 결과 조회에 실패했습니다." }, { status: 500 });
  }
}
