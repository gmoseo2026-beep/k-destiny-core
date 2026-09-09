# 콩닥 — Opus5 패치 커밋·정리·배포 지시 (Gemini 실행용)

Cowork 프리체크 통과(blocker 없음). 아래 순서대로 실행해 줘.

## 1. 커밋 — 심각도별 3분할 (파일 단위로 그룹)
`git status`로 변경 파일 확인 후, 아래처럼 **파일 단위**로 3개 커밋으로 나눠(한 파일에 여러 심각도가 섞였으면 그 파일에 포함된 최고 심각도 커밋에 넣는다).

**커밋 1 — blocker (H-6 / H-7 / H-8):** 결제·연동·세션 핵심
```
git add app/api/payments/complete/route.ts app/api/user/claim-unlock/route.ts "app/api/auth/[...nextauth]/route.ts"
git commit -m "fix(security): blocker 패치 — claim 토큰 소유권 단일화(H-7), PG 재조회 증폭 차단·토큰 1회 발급(H-6), 삭제계정 JWT 무효화(H-8)"
```

**커밋 2 — Medium:** 탈퇴 API·자동연동 폐지(수동 버튼)·유출벡터 정제
```
git add app/api/admin/users/delete/route.ts components/DashboardView.tsx components/CompatResultClient.tsx app/[locale]/pay/complete/page.tsx
git commit -m "fix(security): Medium 패치 — 자동귀속 폐지 후 수동 연동 버튼(M-8), body 토큰 수용 중단(M-9), redirectUrl GA4·히스토리 유출 정제"
```

**커밋 3 — Low + 스키마:** 나머지 경미 하드닝
```
git add -A
git commit -m "chore(security): Low 패치 — 예외 메시지 로그 전용화(L-4), 실패 시 쿠키 소각(L-5), 연동 시 DB 토큰 소각(L-6), Order.claimToken 스키마"
```
> 파일 구성이 위와 다르면 `git status` 기준으로 심각도 높은 쪽에 배치. 억지로 hunk를 쪼개지 말 것.

## 2. 잔여 claim 토큰 정리 (배포 전, 1회)
`콩닥_Opus5_재검수_결과.md` 부록 A의 SQL을 우선 사용. 없으면 아래로 — **구버전 90일 토큰만** 겨냥(신규 7일 토큰은 보존):
```sql
UPDATE "Order"
SET "claimToken" = NULL, "claimTokenExpiresAt" = NULL
WHERE "userId" IS NULL
  AND "claimToken" IS NOT NULL
  AND "claimTokenExpiresAt" > now() + interval '7 days';
```
실행 전 `SELECT count(*)`로 대상 건수 먼저 확인하고, 결과(건수) 보고해 줘.

## 3. 배포
```
python scripts/safe_deploy.py
```
`BUILD_EXIT=0` + PM2 재시작 + `Deploy VERIFIED` 확인.

## 4. 보고
- 커밋 3개 해시 + 각 포함 파일
- 잔여 토큰 정리 대상 건수
- 배포 로그 마지막(VERIFIED)

배포 완료되면 Cowork가 E2E(게스트 결제 → 타 이메일/카카오 로그인 → 연동하기 → 열람, 그리고 탈퇴 후 재가입)를 검증한다.
