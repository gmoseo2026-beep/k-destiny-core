# REVIEW_HANDOFF.md — Opus5 검수 인계 문서

> 작성일: 2026-09-16
> 커밋: `c8ddb6e feat(fortune): 2026 총운 비회원 무료 맛보기(점수+연애운 1개) 및 서버 리댁션 추가`
> 배포 상태: **Deploy VERIFIED ✅ (Contabo 운영 서버 실배포 및 실측 스모크 완료)**

---

## 1. 변경 파일 및 목적

| 파일 경로 | 변경 목적 |
| :--- | :--- |
| `app/[locale]/fortune/annual/page.tsx` | 비로그인 및 프로필 미등록 시 로그인/온보딩으로 튕기던 강제 리다이렉트(`redirect`) 제거. 게스트 진입 지원 |
| `app/api/fortune/annual/route.ts` | ① 비회원 요청(`!userId`) 경로 신설: IP 기반 Rate Limit, 생년월일 유효성 검증<br>② **엔진 재사용**: `lib/saju.ts`의 `calculateFourPillars`로 1인 사주 명식 인메모리 계산 (새 명리 로직 없음)<br>③ **엄격한 서버 리댁션**: 비회원에게 `yearScore`, `headline`, `summary`, `sections.love`만 반환<br>④ **유료 4영역/12개월/행운포인트 원천 삭제** 및 **DB 미저장** 보장<br>⑤ 기존 회원 경로 및 entitlement/결제/캐시 로직 100% 보존 |
| `app/[locale]/fortune/annual/AnnualFortuneClient.tsx` | ① 비회원 및 프로필 미등록자를 위한 간결한 1인 사주 입력 폼(생년월일·성별·시간·개인정보 미저장 안심 배지) 제공<br>② `sessionStorage` 자동 복원 연동<br>③ 무료 맛보기 결과 노출 및 잠금 영역 블러 티저 유지<br>④ 유료 결제 CTA 클릭 시 친절한 로그인 안내 및 `callbackUrl` 보존<br>⑤ "🔄 다른 생년월일로 다시 보기" 원클릭 버튼 추가 |
| `scripts/test_annual_guest_redaction.ts` | 비회원 API 호출 시 유료 영역 누출 여부 및 DB 미저장을 검증하는 자동화 테스트 스크립트 |

---

## 2. 결정론 로직 및 사주 엔진 보존
- `lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts` 사주 계산 로직: **100% 미수정 보존**.
- 비회원 총운 계산 시에도 기존 궁합에서 검증된 `calculateFourPillars` 함수를 그대로 호출하여 일간, 사주원국, 오행 점수를 산출.

---

## 3. 테스트 및 실측 검증 결과

1. **자동화 서버 리댁션 테스트 (`scripts/test_annual_guest_redaction.ts`)**:
   - `yearScore`, `headline`, `summary`, `sections.love` 정상 반환
   - `sections.money`, `sections.career`, `sections.health`, `sections.relationship` → **누출 0% (`undefined`)**
   - `monthlyHighlights`, `luckyPoints` → **누출 0% (`undefined`)**
   - 비회원 DB 레코드(`AnnualFortune`, `UserSajuProfile`) 변화: **0건 생성 (인메모리 연산 확인)**
2. **TypeScript 타입 검사 (`npx tsc --noEmit`)**: 에러 0건 통과
3. **Next.js 프로덕션 빌드 (`npm run build`)**: 34개 라우트 정상 컴파일 (종료코드 0)
4. **운영 서버 (`https://kongdak.kr`) 실측 스모크 결과**:
   - `GET /ko/fortune/annual` → HTTP 200 OK (비회원 리다이렉트 없이 즉시 진입)
   - `POST /api/fortune/annual` (비회원 생년월일 전송) → HTTP 200 OK, `locked: true`, `isGuest: true`, `yearScore: 85`, `love: 75`, 유료 4개 영역/12개월/행운포인트 누출 여부 `False` 확인

---

## 4. 보안 / PII / 결제 변경점

1. **비회원 PII 보호**:
   - 비회원이 입력한 생년월일 및 시간은 DB에 저장하거나 계정에 귀속하지 않으며, API 요청 처리 중 인메모리 사주 계산에만 사용된 후 즉시 소멸합니다.
2. **서버 리댁션 보안**:
   - 클라이언트에서 가리는 방식이 아닌 서버단에서 원천 키 삭제 후 응답하므로, 개발자 도구 네트워크 탭 검사 시에도 유료 4영역/12개월/행운포인트가 전혀 노출되지 않습니다.
3. **결제 및 Entitlement 무결성 보존**:
   - 기존 총운 단건 결제(첫 결제 1,900원 / 이후 2,900원) 및 30일 무제한 패스(9,900원) 결제·권한 로직은 변경 없이 100% 보존되었습니다.
   - 비회원이 결제 버튼을 누를 경우 로그인을 안내하고 `callbackUrl`을 보존하여 결제 플로우로 매끄럽게 연결됩니다.

---

## 5. 스스로 의심 지점 (Self-Critical Reflection)
- **비회원 과다 요청에 따른 Gemini API 비용 발생 가능성**:
  - 완화책: `/api/fortune/annual` 비회원 경로에 IP 기반 Rate Limiter(`lib/rateLimiter.ts`의 `checkChatRateLimit`)를 적용하여 단시간 비정상 대량 호출을 차단하고 있습니다.
- **로그인 후 복귀 시 생년월일 재입력 불편 여부**:
  - 완화책: 비회원 입력 시 브라우저 `sessionStorage`에 입력값을 임시 보관하여, 로그인 후 다시 `/fortune/annual`로 돌아왔을 때 입력폼이 자동으로 복원되도록 구현했습니다.
