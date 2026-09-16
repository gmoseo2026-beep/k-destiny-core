import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runTest() {
  const { POST } = await import("../app/api/fortune/annual/route");
  const prisma = (await import("../lib/prisma")).default;
  console.log("=== 2026 총운 비회원 무료 맛보기(서버 리댁션) 검증 시작 ===");

  // 1. DB 카운트 사전 기록 (DB 연결 가능 시)
  let annualCountBefore: number | null = null;
  let profileCountBefore: number | null = null;
  try {
    annualCountBefore = await prisma.annualFortune.count();
    profileCountBefore = await prisma.userSajuProfile.count();
  } catch {
    console.log("ℹ️ 로컬 DB 미연결 — 인메모리 엔드포인트 응답 및 리댁션 구조 중심 검증 수행");
  }

  // 2. 비회원 게스트 요청 시뮬레이션 (세션 없음)
  const guestPayload = {
    name: "게스트테스터",
    birthYear: 1995,
    birthMonth: 8,
    birthDay: 20,
    time: "14:30",
    gender: "F",
    locale: "ko",
  };

  const req = new Request("http://localhost:3000/api/fortune/annual", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(guestPayload),
  });

  console.log("-> 비회원 요청 전송:", guestPayload);
  const res = await POST(req);
  console.log("-> 응답 상태코드:", res.status);

  if (res.status !== 200) {
    const errBody = await res.json();
    console.error("응답 실패:", errBody);
    process.exit(1);
  }

  const json = await res.json();
  console.log("-> 응답 수신 성공!");
  console.log("-> locked 플래그:", json.locked);
  console.log("-> isGuest 플래그:", json.isGuest);
  console.log("-> 반환 데이터 최상위 키 목록:", Object.keys(json.data));

  const data = json.data;

  // 3. 맛보기 허용 필드 검증
  if (typeof data.yearScore !== "number") {
    throw new Error(`[FAIL] yearScore가 숫자가 아닙니다: ${data.yearScore}`);
  }
  if (!data.headline || typeof data.headline !== "string") {
    throw new Error("[FAIL] headline이 없습니다.");
  }
  if (!data.summary || typeof data.summary !== "string") {
    throw new Error("[FAIL] summary가 없습니다.");
  }
  if (!data.sections?.love?.text) {
    throw new Error("[FAIL] sections.love 맛보기 텍스트가 없습니다.");
  }

  console.log("✅ 맛보기 필드 확인 완료:");
  console.log(`   - 올해 총운 점수: ${data.yearScore}점`);
  console.log(`   - 한 줄 요약: "${data.headline}"`);
  console.log(`   - 총평: "${data.summary.slice(0, 50)}..."`);
  console.log(`   - 연애운 샘플 점수: ${data.sections.love.score}점`);

  // 4. 유료 콘텐츠 서버 리댁션 (원천 누출 차단) 검증
  const forbiddenPaidKeys = [
    "money",
    "career",
    "health",
    "relationship",
  ];

  for (const key of forbiddenPaidKeys) {
    if (data.sections && data.sections[key] !== undefined) {
      throw new Error(`🚨 [CRITICAL LEAK] 비회원 응답에 유료 섹션 sections.${key} 가 노출되었습니다!`);
    }
  }

  if (data.monthlyHighlights !== undefined) {
    throw new Error("🚨 [CRITICAL LEAK] 비회원 응답에 유료 영역 monthlyHighlights 가 노출되었습니다!");
  }

  if (data.luckyPoints !== undefined) {
    throw new Error("🚨 [CRITICAL LEAK] 비회원 응답에 유료 영역 luckyPoints 가 노출되었습니다!");
  }

  const sectionKeys = Object.keys(data.sections || {});
  if (sectionKeys.length !== 1 || sectionKeys[0] !== "love") {
    throw new Error(`🚨 [CRITICAL LEAK] sections에 'love' 외의 다른 키가 포함되어 있습니다: ${sectionKeys.join(", ")}`);
  }

  console.log("✅ 유료 콘텐츠 누출 차단 검증 완료:");
  console.log("   - sections.money 누출 여부: 없음 (undefined)");
  console.log("   - sections.career 누출 여부: 없음 (undefined)");
  console.log("   - sections.health 누출 여부: 없음 (undefined)");
  console.log("   - sections.relationship 누출 여부: 없음 (undefined)");
  console.log("   - monthlyHighlights 누출 여부: 없음 (undefined)");
  console.log("   - luckyPoints 누출 여부: 없음 (undefined)");
  console.log("   - 허용된 섹션: [love] 만 단독 존재함");

  // 5. 비회원 DB 미저장 검증 (DB 연결 시)
  if (annualCountBefore !== null && profileCountBefore !== null) {
    const annualCountAfter = await prisma.annualFortune.count();
    const profileCountAfter = await prisma.userSajuProfile.count();

    if (annualCountAfter !== annualCountBefore) {
      throw new Error(`🚨 [FAIL] 비회원 요청인데 AnnualFortune DB 레코드가 생성되었습니다! (${annualCountBefore} -> ${annualCountAfter})`);
    }
    if (profileCountAfter !== profileCountBefore) {
      throw new Error(`🚨 [FAIL] 비회원 요청인데 UserSajuProfile DB 레코드가 생성되었습니다! (${profileCountBefore} -> ${profileCountAfter})`);
    }

    console.log("✅ 비회원 PII 및 캐시 DB 미저장 검증 완료:");
    console.log(`   - AnnualFortune 테이블 변화: ${annualCountBefore} -> ${annualCountAfter} (0건 생성)`);
    console.log(`   - UserSajuProfile 테이블 변화: ${profileCountBefore} -> ${profileCountAfter} (0건 생성)`);
  }

  console.log("\n🎉 [ALL TESTS PASSED] 2026 총운 비회원 맛보기 응답에 유료 영역이 0% 완벽하게 차단되었습니다!");
}

runTest()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
