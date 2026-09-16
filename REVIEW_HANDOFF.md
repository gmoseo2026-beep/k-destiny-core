# REVIEW_HANDOFF.md — Opus5 검수 인계 문서

> 작성일: 2026-09-16  
> 작업: **[긴급] 비회원 맛보기 500 에러 긴급 핫픽스 (thinkingBudget: 0 설정 및 maxOutputTokens 상향)**  
> 배포 상태: **`safe_deploy.py` 배포 완료 (`Deploy VERIFIED ✅`)**  

---

## 1. 긴급 장애 원인 및 해결 요약

- **증상**: 비회원 총운 무료 맛보기에서 생년월일 입력 후 "총운을 불러오지 못했습니다" 500 에러 발생.
- **원인**: `gemini-2.5-flash`는 추론(thinking) 모델로서, 내부 추론 토큰이 `maxOutputTokens` 예산에서 먼저 차감됨. 맛보기에 설정되었던 `maxOutputTokens: 1024`가 thinking에 전부 소진되어 실제 JSON 출력이 잘리면서 `finishReason=MAX_TOKENS` 발생 → `repairJSON` 실패로 500 에러 유발.
- **해결**:
  1. 모든 JSON 생성 라우트의 `generationConfig`에 `thinkingConfig: { thinkingBudget: 0 }` 적용 (추론 토큰 0으로 비활성화하여 전체 예산을 JSON 생성에 사용).
  2. `maxOutputTokens` 안전값 상향 조정:
     - 맛보기(게스트 / 미결제 회원): 1024 → 3072
     - 이번주 운세: 2048 → 4096
     - 전체 총운: 8192 유지
     - 궁합 deep-report: 8192 유지
  3. 세 라우트 공통 JSON 파싱 실패 시 `finishReason` 및 `textLen` 진단 로그 추가.

---

## 2. 변경 파일 및 세부 내역

| 파일 경로 | 변경 내역 |
| :--- | :--- |
| `app/api/fortune/annual/route.ts` | ① 게스트/회원 맛보기 `maxOutputTokens: 3072` + `thinkingConfig: { thinkingBudget: 0 }`<br>② 전체 총운 `maxOutputTokens: 8192` + `thinkingConfig: { thinkingBudget: 0 }`<br>③ JSON 파싱 실패 시 `[annual-teaser parse-fail]` / `[annual-full parse-fail]`에 `finishReason`과 `textLen` 로깅 |
| `app/api/fortune/weekly/route.ts` | ① 이번주 운세 `maxOutputTokens: 4096` + `thinkingConfig: { thinkingBudget: 0 }`<br>② JSON 파싱 실패 시 `[weekly parse-fail]`에 `finishReason`과 `textLen` 로깅 |
| `app/api/compat/deep-report/route.ts` | ① 궁합 심층 `maxOutputTokens: 8192` + `thinkingConfig: { thinkingBudget: 0 }`<br>② JSON 파싱 실패 시 `[deep-report parse-fail]`에 `finishReason`과 `textLen` 로깅 |

---

## 3. 검증 결과

1. **실측 검증 (`scripts/test_annual_guest_redaction.ts`)**:
   - `thinkingBudget: 0` 적용 전: `genMs=15857`, `finishReason=MAX_TOKENS`, 파싱 실패 (500 에러)
   - `thinkingBudget: 0` + `3072` 적용 후: **`genMs=3105` (3.1초 초고속 생성)**, **`finishReason=STOP`**, **200 OK 정상 반환**
   - 유료 4개 영역(`money`, `career`, `health`, `relationship`), 12개월, 행운포인트 누출 0% 차단 확인
   - 비회원 DB 미저장(PII 보호) 확인
2. **타입 검사 (`npx tsc --noEmit`)**: 통과 (에러 0건)
3. **프로덕션 빌드 (`npm run build`)**: Turbopack 빌드 성공 (종료코드 0)
4. **서버 배포 (`python scripts/safe_deploy.py`)**:
   - Git fetch & reset 완료 (`origin/main 01a5faf`)
   - 서버 `npm run build` 성공 (`BUILD_EXIT=0`)
   - PM2 재시작 완료 (`k-destiny`, `k-destiny-autopilot` online)
   - 서비스 헬스체크: `HTTP Status: HTTP/1.1 200 OK`
   - **`Deploy VERIFIED. ✅`** 확인

---

## 4. 보안 / PII / 결제 변경점

- **결제 / Entitlement / Redaction / 캐시 로직 무변경**: AI 호출 시의 토큰 및 thinking 파라미터만 조정하였으며, 비즈니스/결제 로직은 100% 보존되었습니다.
- **시크릿 하드코딩 없음**: 환경변수 및 credential 안전 관리 준수.
