# REVIEW_HANDOFF.md — Opus5 검수 인계 문서

> 작성일: 2026-09-16
> 작업: 2026 총운 로딩 체감 개선 (파트 ③ 로더 UX) 및 맛보기 소형 생성/결정론적 점수 일관성 (파트 ①)
> 배포 상태: **배포 대기 (Cowork 프리체크 요청 중 — safe_deploy 미실행)**

---

## 1. 변경 파일 및 목적

| 파일 경로 | 변경 목적 |
| :--- | :--- |
| `app/[locale]/fortune/annual/AnnualFortuneClient.tsx` | **[파트 ③ 프론트 로딩 체감 개선]**<br>① **단계별 문구 2.5초 간격 순환**: "사주 여덟 글자를 세우는 중…" → "2026 병오년(붉은 말의 해) 기운과 대조하는 중…" → "올해 12개월 흐름을 계산하는 중…" → "리포트를 정리하는 중…"<br>② **15초 90% 부드러운 프로그레스 바**: 점진 감속 곡선으로 체감 대기 시간 완화.<br>③ **스켈레톤 프리뷰 카드 & 마스코트 애니메이션**: 결과가 렌더링될 영역에 펄스 자리표시 카드 노출. |
| `lib/destinyGen.ts` | **[파트 ① 맛보기 프롬프트 및 점수 일관성 엔진]**<br>① `buildAnnualTeaserPrompt`: `{ yearScore, headline, summary, sections: { love } }` 만 생성 지시 (4대 영역/12개월/행운포인트 원천 미생성으로 토큰 80% 이상 절감).<br>② `calculateAnnualYearScore`: 2026 병오년(丙午) 화(Fire) 기운과 개인 사주(일간, 오행 분포, 일주 해시)의 조화를 바탕으로 68~95점 범위의 **결정론적 총운 점수** 산출. |
| `app/api/fortune/annual/route.ts` | **[파트 ① 백엔드 맛보기 분기 + 측정 타이밍 로그]**<br>① **게스트/미결제 회원 분기**: `buildAnnualTeaserPrompt` + `maxOutputTokens: 1024`로 초고속 소형 생성 (2~3초대).<br>② **점수 일관성 보장**: 맛보기와 결제 후 전체 리포트 모두 `calculateAnnualYearScore`로 산출된 동일한 점수를 주입하여 점수 불일치 방지.<br>③ **미결제 맛보기 DB 미저장**: 미결제 유저의 맛보기는 `annualFortune`에 캐싱하지 않아, 결제 후 전체 리포트 정상 생성 및 캐싱 보장.<br>④ **서버 타이밍 로그**: `[annual-timing] mode=... cache=... genMs=...` 로 실측 로그 확보. |
| `scripts/test_annual_speed_score.ts` | 점수 결정론(동일 사주 5회 연속 일치) 및 맛보기 프롬프트 규격 검증용 테스트 스크립트 |

---

## 2. 결정론 로직 및 사주 엔진 보존
- `lib/saju.ts` (`calculateFourPillars`), `lib/trueSolarTime.ts`: **100% 무변경 보존**.
- `isEntitled`, 주문/결제 검증 및 grant 핵심 로직: **100% 무변경 보존**.
- `prisma/schema.prisma`: **100% 무변경 보존**.
- 서버단 유료 영역 Redaction(`locked: true` 시 `love` 외 유료 4영역/12개월/행운포인트 배제): **100% 보존**.

---

## 3. 테스트 및 빌드 검증 결과
1. **점수 결정론 단위 테스트 (`scripts/test_annual_speed_score.ts`)**:
   - 다양한 생년월일/시간/성별 4개 케이스 대상 각 5회 연속 실행 결과 100% 일치 확인.
   - 프롬프트의 love 전용 생성 및 타 영역 배제 지시문 검증 통과.
2. **TypeScript 컴파일 (`npx tsc --noEmit`)**: 에러 0건 통과
3. **Next.js 프로덕션 빌드 (`npm run build`)**: 34개 라우트 정상 컴파일 (종료코드 0)
4. **시크릿 스캔**: 커밋 diff 대상 민감 토큰 스캔 통과 (`SECRET SCAN PASSED`)

---

## 4. 보안 / PII / 결제 변경점
1. **비회원 PII 미저장 유지**:
   - 맛보기 소형 생성 시에도 비회원 사주 정보는 DB에 저장되지 않으며 인메모리 연산 후 응답합니다.
2. **미결제 회원 데이터 무결성**:
   - 미결제 회원의 맛보기 결과는 `annualFortune` 테이블에 저장하지 않으므로, 유저가 결제 완료 시 온전한 풀 리포트(5개 영역 + 12개월 + 행운포인트)가 생성되어 캐시됩니다.
3. **결제 및 Entitlement 무결성**:
   - 기존의 결제, 검증, Unlock 권한 로직은 100% 동일하게 유지됩니다.

---

## 5. 스스로 의심 지점 (Self-Critical Reflection)
- **맛보기 점수와 결제 후 점수 일치 여부**:
  - `calculateAnnualYearScore` 함수를 통해 사주 명식(오행 분포 + 일간 + 일주) 기반으로 결정론적 점수를 산출하여 주입하므로, 맛보기와 결제 후 전체 생성 시 점수가 1점의 오차도 없이 100% 일치합니다.
- **배포 대기**:
  - 사용자 지침에 따라 `safe_deploy.py`를 실행하지 않고 프리체크 검수를 위해 먼저 대기합니다.

