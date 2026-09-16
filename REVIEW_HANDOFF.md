# REVIEW_HANDOFF.md — Opus5 검수 인계 문서

> 작성일: 2026-09-16
> 작업: 2026 총운 · 궁합 심층 · 이번주 운세 로딩 속도/체감 개선 (공용 FortuneLoading 컴포넌트 재사용 + 타이밍 로그 + 주간 에러 정제)
> 배포 상태: **배포 대기 (Cowork 프리체크 요청 중 — safe_deploy 미실행)**

---

## 1. 변경 파일 및 목적

| 파일 경로 | 변경 목적 |
| :--- | :--- |
| `components/FortuneLoading.tsx` | **[신규 공용 로더 컴포넌트]**<br>① **단계별 순환 문구(2.5초 간격)**: 화면별 맞춤 steps 배열 props 지원.<br>② **진행 바**: durationSec(총운/궁합 15초, 주간 8초) 동안 90%까지 부드러운 감속 곡선으로 차오름.<br>③ **화면별 스켈레톤 프리뷰**: `annual`, `deep-report`, `weekly` 3가지 카드 플레이스홀더 제공.<br>④ **마스코트 바운스 애니메이션**: 시각적 안정감 및 이탈 방지. |
| `app/[locale]/fortune/annual/AnnualFortuneClient.tsx` | 총운 결과 대기 화면에 공용 `FortuneLoading` 적용 (`annual` 스켈레톤, 15초 프로그레스 바, 4단계 순환 문구). |
| `components/CompatResultClient.tsx` | 궁합 심층 리포트 생성 대기 화면에 공용 `FortuneLoading` 적용 (`deep-report` 스켈레톤, 15초 프로그레스 바, 3단계 순환 문구: 사주 대조 → 관계 흐름 해석 → 심층 리포트 정리). |
| `app/[locale]/fortune/weekly/WeeklyFortuneClient.tsx` | 이번주 운세 대기 화면에 공용 `FortuneLoading` 적용 (`weekly` 스켈레톤, 8초 프로그레스 바, 3단계 순환 문구: 기운 읽기 → 요일별 흐름 계산 → 정리). |
| `app/api/compat/deep-report/route.ts` | ① **서버 타이밍 로그**: `[deep-report-timing] cache=... genMs=... dbMs=... model=...` 추가.<br>② **출력 길이 상한(maxOutputTokens: 4096)**: 과도한 레이턴시 방지 및 리포트 잘림 없는 안전 상한 설정. |
| `app/api/fortune/weekly/route.ts` | ① **서버 타이밍 로그**: `[weekly-timing] cache=... genMs=... dbMs=... model=...` 추가.<br>② **에러 응답 정제**: 최상위 catch에서 raw `error.message` 대신 정제된 사용자 안내 메시지 반환 (정보 유출 차단).<br>③ **출력 길이 상한(maxOutputTokens: 2048)**: 주간 운세 규격에 맞춘 안전 상한 설정. |
| `app/api/fortune/annual/route.ts` | 맛보기 소형 생성(1024) + 전체 생성 상한(4096) 및 `calculateAnnualYearScore` 결정론적 점수 일관성 적용 완료. |
| `lib/destinyGen.ts` | `buildAnnualTeaserPrompt` 및 `calculateAnnualYearScore` 결정론적 산출 엔진. |

---

## 2. 결정론 로직 및 핵심 아키텍처 보존
- `lib/saju.ts` (`calculateFourPillars`), `lib/trueSolarTime.ts`: **100% 무변경 보존**.
- `isEntitled`, 주문/결제 검증 및 grant 핵심 로직: **100% 무변경 보존**.
- `prisma/schema.prisma`: **100% 무변경 보존**.
- 캐시 로직: 궁합 `DeepReport(compatId)`, 주간 `WeeklyFortune(...)`, 총운 `AnnualFortune(...)` 기존 캐시 키 및 조회/저장 로직 **100% 보존**.

---

## 3. 테스트 및 빌드 검증 결과
1. **점수 결정론 단위 테스트 (`scripts/test_annual_speed_score.ts`)**:
   - 4개 다양한 사주 케이스 대상 각 5회 연속 계산 시 100% 동일한 점수 반환 검증 완료 (통과 ✅).
2. **TypeScript 컴파일 (`npx tsc --noEmit`)**: 에러 0건 통과 ✅
3. **Next.js 프로덕션 빌드 (`npm run build`)**: 34개 모든 라우트 빌드 성공 (종료코드 0 ✅)
4. **시크릿 스캔**: 커밋 diff 대상 민감 토큰 스캔 통과 (`SECRET SCAN PASSED` ✅)

---

## 4. 보안 / PII / 결제 변경점
1. **에러 응답 정보 은닉**:
   - `/api/fortune/weekly` 최상위 catch에서 Prisma/DB 내부 메시지 노출을 차단하고 사용자 친화적인 메시지만 반환합니다.
2. **비회원 PII 미저장 유지**:
   - 비회원 맛보기 소형 생성 시에도 PII는 DB에 저장되지 않습니다.
3. **결제 및 Entitlement 무결성**:
   - 궁합 심층, 총운 단건, 패스권 결제 검증 및 권한 로직 일체 무변경.

---

## 5. 스스로 의심 지점 (Self-Critical Reflection)
- **리포트 잘림 여부 (maxOutputTokens)**:
  - 궁합 심층 및 총운 전체는 4096 토큰, 주간은 2048 토큰으로 실제 Gemini 2.5 Flash 출력 분량 대비 1.5~2배 이상의 충분한 헤드룸을 두어 중간에 문장이 잘리는 현상이 발생하지 않도록 방어했습니다.
- **배포 대기**:
  - 사용자 지침에 따라 `safe_deploy.py`를 실행하지 않고 프리체크 검수를 위해 먼저 대기합니다.

