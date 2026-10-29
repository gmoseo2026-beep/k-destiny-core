# REVIEW_HANDOFF — Argon 01 (`argon/01-account-delete`: 셀프 회원 탈퇴)
# REVIEW_HANDOFF — Argon 02. 신년 시즌 전환 (`argon/02-season-2027`)
# REVIEW_HANDOFF — Argon 03. 결제창 후기 보강 (`argon/03-checkout-review-fallback`)
# REVIEW_HANDOFF — Argon 04. 후기 요청 강화 (`argon/04-review-prompt`)

> **작성 일시**: 2026-10-29
> **기반 브랜치**: `origin/main` (`c963b6e`)

### 1. 바뀐 파일
- `lib/accountDeletion.ts` (신규): 관리자 삭제 API(`app/api/admin/users/delete/route.ts`)의 트랜잭션 기반 영구 삭제·개인정보 파기 로직(`executeUserDeletion`, `maskEmail`)을 공용 모듈로 추출. 감사로그(`SELF_DELETE` / `USER_DELETE`) 기록, `Order.claimToken` 소각(`Order` 행 자체는 `onDelete: SetNull`로 전자상거래법 5년 보관), `Unlock` 귀속 해제·이메일 파기·즉시 만료 처리, `Compatibility`·`TelegramAccount`·`GeneratedReport`·`ReportCache`·`CompatInvite` 귀속 해제, 미사용 `Coupon`·`PushSubscription`·`AnnualFortune` 삭제 후 `User` 삭제.
- `app/api/admin/users/delete/route.ts` (수정): 공용 `executeUserDeletion`을 호출하도록 정리.
- `app/api/user/account/route.ts` (신규): `DELETE /api/user/account` — 세션 필수(비로그인 401), 타인 `userId` 지정 시 403 거부, 관리자 계정(`ADMIN`) 오삭제 방지 400, 본인 계정만 삭제.
- `components/member/AccountDeleteSection.tsx` (신규): `/ko/me` 회원 하단 `"회원 탈퇴"` 버튼 + 확인 모달(`"열람 기간이 남은 리포트도 더 이상 볼 수 없어요"`, 동의 체크박스 필수, `account_delete_open` / `account_delete_done` GA4 이벤트, 기기 내 `localStorage` 주문·쿠폰 토큰 정리 후 `signOut`으로 홈 이동).
- `components/MeClient.tsx` (수정): 로그인 회원 보관함 최하단에 `AccountDeleteSection` 배치(비회원 화면에는 미노출).
- `tests/routes/accountDelete.test.ts` (신규): 비로그인 401, 타인 계정 삭제 시도 403 및 본인 계정만 삭제, `Order` 행 보존(`tx.order.delete` 미호출 + `prisma/schema.prisma` `onDelete: SetNull` 정적 검증), 관리자 계정 400 테스트 4건.

### 2. 테스트 결과(통과 수)
- `npx tsc --noEmit`: 0 errors
- `npx eslint` (변경 파일 6개): 0 errors, 0 warnings
- `npx vitest run`: **78개 파일 585개 테스트 통과** (1 skipped: live E2E)
- `npm run build`: Next.js 16.3.8 프로덕션 빌드 성공 (`/api/user/account` 라우트 정상 생성)

### 3. 직접 화면에서 확인한 것
- `MeClient` 로그인 회원 분기 최하단에만 작은 `"회원 탈퇴"` 버튼이 렌더링되고 비회원 분기에는 노출되지 않음 확인.
- 모달 오픈 시 `"열람 기간이 남은 리포트도 더 이상 볼 수 없어요"` 경고 문구와 동의 체크박스 미체크 상태에서 탈퇴 버튼 `disabled` 동작 및 탈퇴 성공 후 `signOut({ callbackUrl: "/ko" })` 경로 확인.

### 4. 스스로 의심하는 점
- 회원 탈퇴 후 `Order.userId`가 `null`이 되었을 때 같은 브라우저 `localStorage`에 예전 `kongdak_order_*` 토큰이 남아 있으면 재가입 시 `claim-device-orders`(7일 이내 `userId: null` 주문 자동 귀속)가 다시 붙거나 베어러 토큰으로 열람될 여지가 있어, ① 서버에서 `Unlock.expiresAt`을 탈퇴 시각으로 즉시 만료 처리하고 ② 클라이언트에서도 탈퇴 성공 직후 `kongdak_order_*`, `kongdak_unlock_*`, `kd_last_order_*`, `kongdak_pay_attempts`, `kongdak_coupon_v1`을 함께 비우도록 이중 방어했습니다.

### 5. 클로드에게 필요한 것
- 약관(`messages/ko.json`의 `Legal.*`)은 지시서 §0.9에 따라 수정하지 않았습니다. 약관 내 탈퇴 신청 경로 안내에 이메일 외에 **"내 보관함(`/ko/me`) 하단 회원 탈퇴"** 경로 병기가 필요한지 검토 부탁드립니다.
- **바뀐 파일**:
  - `lib/season.ts` (신규): KST `2026-11-01 00:00:00`(`SEASON_2027_STARTS_AT`) 단일 전환 시각, 2027 핵심 3종(`annual_2027`, `premium_2027_daeun`, `set_2027`), 히어로 슬라이드 순서(`getSeasonHeroSlideOrder`), 히어로 직하단 첫 추천(`getSeasonFirstRecommendations`), 세트 진열(`sortSeasonSets`), 폴백 큐레이션 정렬(`sortFallbackRecommendations`) 정의
  - `components/home/HomeHeroCompact.tsx`: `HERO_2027_FIRST_FROM`을 `SEASON_2027_STARTS_AT`(11/1 0시 KST)으로 단일화해 11/1 0시부터 `annual_2027` → `premium_2027_daeun` → `inner_mind` → `compat_basic` 순으로 전환, 2027 시즌 활성 시 `season_hero_view` (`value: 2027`) GA4 이벤트 1회 발사
  - `components/home/HomeExplore.tsx`: 11/1 0시부터 `"전체"` 탭 히어로 바로 아래에 `"🌅 미리 보는 2027 신년 추천"`(`annual_2027`, `premium_2027_daeun`, `set_2027`) 섹션 노출 및 세트 목록에서 `set_2027` 최상단 정렬(새 "한정" 문구 없이 카탈로그 기존 `12/31까지` 값만 사용)
  - `components/product/ProductsExplorerClient.tsx`, `app/[locale]/page.tsx`, `app/[locale]/products/page.tsx`: 서버 렌더 시각(`now`)을 전달해 자정 경계 하이드레이션 불일치를 방지하고 전체 탐색 세트 정렬에도 동일 기준 적용
  - `lib/home/ranking.ts`: 실결제 20건 이상 TOP 5 순위는 그대로 보존하고, 20건 미만 폴백 큐레이션에서만 11/1 0시부터 2027 핵심 3종 우선 배치(SWR 캐시 키 `home:ranking:2026` / `home:ranking:2027` 분리)
  - `tests/season2027.test.ts` (신규), `tests/p016Design.test.ts`, `tests/p018HomeAndPay.test.ts`: `2026-10-31 23:59 KST` vs `2026-11-01 00:00 KST` 주입 단위 테스트 및 기존 12/1 전환 단언 갱신
- **테스트 결과(통과 수)**:
  - `npx tsc --noEmit`: 0 errors
  - `npx eslint <바뀐 파일>`: 0 errors
  - `npx vitest run`: 78 files passed, 585 tests passed (42 skipped)
  - `npm run build`: exit 0
- **직접 화면에서 확인한 것**:
  - `2026-10-31 23:59 KST` 이전에는 기존 홈 구성(`inner_mind` 1번 슬라이드, 신년 첫 추천 미노출, `set_heart` 세트 1번)이 유지되고, `2026-11-01 00:00 KST` 도달 시 히어로 1·2번(`annual_2027`, `premium_2027_daeun`)과 직하단 첫 추천 3종(`annual_2027`, `premium_2027_daeun`, `set_2027`) 및 `season_hero_view(value: 2027)` 발사가 카탈로그 `12/31까지` 가격과 일치하게 전환되는 것을 검증함.
- **스스로 의심하는 점**:
  - `app/[locale]/page.tsx`가 `revalidate = 60` ISR 캐시를 쓰므로 KST 11월 1일 00:00 정각 직후 최대 60초 동안 직전 캐시가 보일 수 있으나, 첫 재검증 요청 이후 즉시 `home:ranking:2027` 키와 새 `now`로 일관되게 전환됩니다.
- **클로드에게 필요한 것**:
  - **11/1 0시 전 머지·배포 필수** (`argon/02-season-2027`). 법률 문구·환경변수 추가 사항 없음.
- **바뀐 파일**:
  - `lib/reviews.ts`: 결제창 대상 상품의 직접 공개 후기가 0개일 때, 같은 `target`(`"couple"`이면 커플 상품만, `"individual"`이면 개인 상품만) 다른 상품의 실제 공개 후기(`displayOk: true`)를 최근순 최대 2개 조회하는 `getFallbackPublicReviewsForTarget` 추가(기존 후기 농축 로직 `enrichPublicReviewRows` 공통화)
  - `app/api/reviews/route.ts`: `GET /api/reviews?catalogId=…&fallback=1` 요청 시 직접 후기가 0개면 `fallbackReviews`(최대 2개)를 함께 반환하도록 추가(`fallback=1` 미지정 시 기존 `{ reviews }` 응답 그대로 유지)
  - `components/product/ProductReviewsSection.tsx`: `variant="checkout"`에서 직접 후기가 0개이고 `fallbackReviews`가 있을 때 제목을 `"다른 리포트 구매자 후기"`로 표시하고 각 후기마다 해당 후기의 실제 상품명을 함께 노출, `REVIEW_INCENTIVE_NOTE`(쿠폰 지급 고지) 원문 보존, 노출 시 `checkout_reviews_fallback_view` GA4 이벤트 1회 발사
  - `components/GuestCheckoutModal.tsx`: 결제창 오픈/옵션 전환 시 `&fallback=1`로 조회해 `fallbackReviews`와 `productId`를 `ProductReviewsSection`에 전달
  - `tests/reviewsAndCoupons.test.ts`: 커플/개인 `target` 격리 조회(최대 2건) 및 결제창 폴백 마크업(`"다른 리포트 구매자 후기"`, 상품명, `REVIEW_INCENTIVE_NOTE` 보존) 단위 테스트 2건 추가
- **테스트 결과(통과 수)**:
  - `npx tsc --noEmit`: 0 errors
  - `npx eslint <바뀐 파일>`: 0 errors
  - `npx vitest run`: 77 files passed, 583 tests passed (42 skipped)
  - `npm run build`: exit 0
- **직접 화면에서 확인한 것**:
  - 직접 후기가 있는 상품은 기존 `"실제 구매자 후기 (N) · 후기를 쓴 구매자에게는 별점과 관계없이 1,000원 쿠폰을 드려요"`로 나오고, 직접 후기가 0개인 커플/개인 상품은 `"다른 리포트 구매자 후기 · 후기를 쓴 구매자에게는 별점과 관계없이 1,000원 쿠폰을 드려요"` 아래에 각 후기의 상품명(`그 사람의 속마음`, `재회운` 등)과 함께 최대 2개까지만 렌더링됨을 확인함(같은 대상 후기마저 0개면 영역 숨김 유지).
- **스스로 의심하는 점**:
  - 결제창 안에서 사용자가 단품↔세트 라디오 옵션을 바꿀 때도 `targetCatalogId`가 바뀌며 다시 조회하므로, `trackedFallbackKeyRef` 키를 `productId + reviewIds`로 두어 옵션 변경으로 새 폴백이 뜰 때만 중복 없이 이벤트가 발사되도록 처리했습니다.
- **클로드에게 필요한 것**:
  - 없음 (기존 공정위 경제적 이해관계 표시 문구 `REVIEW_INCENTIVE_NOTE` 그대로 유지).
- **바뀐 파일**:
  - `lib/reviewPromptStorage.ts` (신규): 주문 단위 후기 시트 닫기 상태(`localStorage`, `try/catch` 보호) 및 80% 스크롤 도달 판정(`hasReached80PercentScroll`) 헬퍼
  - `components/report/ReviewPromptSheet.tsx` (신규): 유료 리포트 열람 중 80% 스크롤 도달 또는 마지막 섹션 노출(`reachedEnd`) 시 화면 하단에 기존 `ReviewCouponCard`를 한 번 띄우고(`review_prompt_view`), 닫거나 작성 완료 시 해당 주문(`orderKey`)에서 다시 뜨지 않도록 저장하며 상호작용 시 `review_prompt_click` 발사
  - `components/report/ReviewCouponCard.tsx`: `reportId` 외에 주문 토큰(`orderToken`) 기반 후기 제출 및 `onCouponIssued`·`onInteract` 콜백 지원(쿠폰 금액 1,000원 그대로 유지)
  - `app/api/reports/view/route.ts`: 리포트 조회 응답에 주문 식별키 `orderKey`(`report.orderId`) 포함
  - `components/report/ReportViewClient.tsx`: 일반 유료 리포트와 프리미엄 유료 리포트 모두에 하단 `ReviewPromptSheet` 연결
  - `app/api/reviews/route.ts`: 기존 `reportId` 경로를 유지하면서 `orderId`/`orderToken` 기반 후기 자격 조회(`GET`)·작성(`POST`) 지원 추가(본인 PAID 주문 + 열람 확인 필수, `COUPON_AMOUNT = 1000` 유지)
  - `app/api/reports/mine/route.ts`: 보관함 주문 행마다 후기 작성 여부(`hasReviewed`), 즉시 작성 가능 여부(`canReviewNow`), 연결 리포트·상품 ID(`reviewReportId`, `reviewCatalogId`) 반환
  - `components/MeClient.tsx`: `/ko/me` 보관함에서 후기를 아직 안 쓴 주문 행에 `"후기 쓰고 1,000원 쿠폰"` 작은 버튼 추가(`review_prompt_click` 발사, 이미 열람한 주문은 인라인 작성창을 열고 미열람 주문은 리포트 열람/생성 경로로 안내)
  - `tests/reviewPrompt.test.ts` (신규): `localStorage` 주문별 닫기 유지·예외 방어, 80% 스크롤 판정, `orderToken` 기반 후기 작성 및 미열람 주문 거부 단위 테스트 5건 추가
- **테스트 결과(통과 수)**:
  - `npx tsc --noEmit`: 0 errors
  - `npx eslint <바뀐 파일>`: 0 errors
  - `npx vitest run`: 78 files passed, 586 tests passed (42 skipped)
  - `npm run build`: exit 0
- **직접 화면에서 확인한 것**:
  - 유료 리포트를 80% 이상 스크롤하거나 마지막 섹션이 화면에 들어올 때 하단 시트로 `ReviewCouponCard`가 1회 올라오고, `닫기` 클릭 후 새로고침해도 같은 주문에서는 다시 뜨지 않음을 확인함. `/ko/me` 보관함의 미작성 주문 행에 `"후기 쓰고 1,000원 쿠폰"` 버튼이 노출되고 작성 완료 즉시 버튼이 사라지며 상단 보유 쿠폰 안내에 1,000원 쿠폰이 반영됨을 확인함.
- **스스로 의심하는 점**:
  - 구형 `compat_deep`(`DeepReport`) 주문은 `GeneratedReport` 행이 없을 수 있어 `app/api/reviews/route.ts`와 `app/api/reports/mine/route.ts` 모두 `DeepReport` 존재 여부까지 함께 확인해 후기 작성이 막히지 않도록 처리했습니다.
- **클로드에게 필요한 것**:
  - 없음 (쿠폰 금액 1,000원 및 기존 후기 보상 고지 문구 변경 없음).
# REVIEW_HANDOFF — argon/05-lunar-input (음력 생일 입력)
# REVIEW_HANDOFF — argon/08-share-bonus (공유하면 오늘 3번 더)

> **기반 브랜치**: `argon/07-story-card` (`15d5976`)
> **작성 일시**: 2026-10-29

1. **바뀐 파일**
   - `lib/previewLimit.ts` (기기 식별 쿠키 `kd_vid` 해시 + 오늘 KST 날짜 기준 하루 1회만 유효한 서명된 `HttpOnly` 보너스 쿠키 `kd_pvb` 및 서버 메모리 원장으로 `checkPreviewQuota`에서 오늘 미리보기 한도 `+3` 부여 `grantPreviewShareBonus`, `hasPreviewShareBonus`)
   - `app/api/preview/bonus/route.ts` (신규 — `POST /api/preview/bonus`에서 서버 측 `grantPreviewShareBonus` 실행 및 `kd_vid`·`kd_pvb` 쿠키 발급)
   - `app/api/reports/generate/route.ts` (`PREVIEW_LIMIT` 429 응답에 실제 적용 한도 `quota.effectiveLimit` 및 오늘 보너스 잔여 여부 `shareBonusAvailable` 포함)
   - `app/api/og/story/route.tsx` (한도 화면 공유 시 `compatId` 또는 `productId` 기준으로도 개인정보 없는 1080×1920 스토리 카드를 생성하도록 보강)
   - `components/report/PreviewLimitPanel.tsx`, `components/CompatNewClient.tsx`, `components/FortuneNewClient.tsx` (`"결과 카드 공유하고 오늘 3번 더 보기"` 버튼 추가, `"공유하면"` 톤 유지·강요 문구 없음, 공유 시트 오픈 시 `preview_bonus_share` GA4 발사 및 `/api/preview/bonus` 호출 후 미리보기 즉시 재요청)
   - `tests/previewLimit.test.ts` (`kd_vid` 기기당 하루 1회 `+3` 허용·같은 날 2차 요청 거부·보너스 쿠키 타 기기 도용 차단·다음 날 KST 초기화·라우트 쿠키 발급 테스트 추가)
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 통과 (0 errors)
   - `npx eslint` (변경 파일 8개): 통과 (0 errors, 0 warnings)
   - `npx vitest run`: 79 passed / 1 skipped (총 592 tests 통과, `tests/previewLimit.test.ts` 8건 포함)
   - `npm run build`: 통과 (exit code 0)
3. **직접 화면에서 확인한 것**
   - 하루 무료 미리보기 한도 화면(`PreviewLimitPanel`)에서 오늘 보너스를 아직 쓰지 않은 기기일 때만 `"결과 카드를 공유하면 오늘 무료 미리보기를 3번 더 볼 수 있어요(하루 1번)."` 안내와 `"결과 카드 공유하고 오늘 3번 더 보기"` 버튼이 노출됨을 확인.
   - 공유 시트가 열리면 `POST /api/preview/bonus`가 서버에서 `kd_vid` 기기 한도를 `+3`으로 올리고 방금 보려던 미리보기가 즉시 열리며, 추가 3회 소진 후에는 같은 날 버튼이 다시 뜨지 않음을 확인.
4. **스스로 의심하는 점**
   - PM2 재시작이 발생해도 오늘 받은 보너스가 풀리지 않도록 서명된 `HttpOnly` 쿠키(`kd_pvb`, `kd_vid` 해시 결합)와 프로세스 메모리 원장(`grantedVidByDay`)을 병행했습니다. 만약 사용자가 브라우저의 모든 쿠키(`kd_pv`, `kd_pvb`, `kd_vid` 전체)를 통째로 삭제하면 기존 `kd_pv` 한도와 마찬가지로 새 기기로 취급되나, 그 경우에도 IP 기반 `checkRateLimit`과 `checkGlobalAiCap`이 상한선을 방어합니다.
5. **클로드에게 필요한 것**
   - 없음 (`06 → 07 → 08` 순차 기반 브랜치이므로 순서대로 머지 필요)

---

# REVIEW_HANDOFF — argon/07-story-card (인스타 스토리용 결과 카드 9:16)

> **기반 브랜치**: `argon/06-saju-card` (`28e2048`)
> **작성 일시**: 2026-10-29

1. **바뀐 파일**
   - `lib/storyCard.ts` (신규 — 애칭 정제 및 한국 실명·생년월일·이메일·한자 자동 마스킹 `sanitizeStoryNickname`, 기본값 `"나 × 그 사람"` 제목 생성, 한 줄 요약 실명/호칭 스크러빙, 무료 성격용 비식별 결정론 키워드·배지 인코딩/디코딩)
   - `app/api/og/story/route.tsx` (신규 — `1080×1920` 9:16 PNG 동적 생성: 두근이 마스코트 PNG 데이터 URI, 점수, 엔진 키워드 3개, 작업 06의 매력 기운 배지, 한 줄 요약, 하단 워터마크 `kongdak.kr`, 외부 Twemoji CDN 호출 없이 로컬 Pretendard 폰트로만 렌더링)
   - `components/share/StoryCardSaveButton.tsx` (신규 — `"스토리용 카드 저장"` 버튼: 모바일 `navigator.share({ files })` 지원 시 공유 시트 즉시 호출 + `story_card_share`, 미지원·PC 환경에서는 PNG 다운로드 + `story_card_save`)
   - `components/CompatResultClient.tsx`, `components/FortuneNewClient.tsx` (무료 궁합 결과 및 무료 성격 결과 `free_personality`에 `"스토리용 카드 저장"` 버튼 연결, 다운로드 파일명에서도 이름 제거)
   - `tests/storyCard.test.ts` (신규 — 실명·생년월일 마스킹 및 애칭 유지, 한 줄 요약 PII 제거, 닫힌 enum 파라미터 위변조 방어, 실제 1080×1920 PNG 매직 바이트·IHDR 크기 검증 4건)
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 통과 (0 errors)
   - `npx eslint` (변경 파일 6개): 통과 (0 errors, 0 warnings)
   - `npx vitest run`: 79 passed / 1 skipped (총 590 tests 통과, 신규 `tests/storyCard.test.ts` 4건 포함)
   - `npm run build`: 통과 (exit code 0)
3. **직접 화면에서 확인한 것**
   - 무료 궁합 결과(`/ko/compat/[id]`)와 무료 성격 결과(`/ko/fortune/new?productId=free_personality`)에 `"스토리용 카드 저장"` 버튼이 노출되고, URL·파일명·이미지 어디에도 생년월일과 실명이 포함되지 않음을 확인.
   - `/api/og/story`가 정확히 `1080×1920` PNG를 생성하며 두근이·점수·엔진 키워드 3개·매력 기운 배지(있을 때만)·한 줄 요약·`kongdak.kr` 워터마크가 포함됨을 확인.
4. **스스로 의심하는 점**
   - 입력창 라벨이 `"이름 또는 애칭"`이라 카카오 로그인 사용자의 실명(예: `"김민수"`)이 DB에 저장되어 있을 수 있어, 한국 성씨로 시작하는 2~4자 순한글 이름(일상 애칭 허용 목록 제외)은 `"나 × 그 사람"`으로 자동 마스킹하고 한 줄 요약 본문 안의 실명·`"○○님"` 호칭도 함께 치환했습니다. 혹시 성씨 글자로 시작하는 독특한 2~4자 순한글 별명(예: `"김밥"`)을 쓴 경우에도 안전하게 기본값으로 마스킹됩니다.
5. **클로드에게 필요한 것**
   - 없음 (`argon/06-saju-card` 위에 분기한 브랜치이므로 `06` 머지 후 순서대로 머지 필요)

---

# REVIEW_HANDOFF — argon/06-saju-card (사주 여덟 글자 카드 + 매력 기운 배지)

> **기반 브랜치**: `origin/main` (`c963b6e`)
> **작성 일시**: 2026-10-29

1. **바뀐 파일**
   - `types/lunar-javascript.d.ts` (`Lunar.fromYmd`, `LunarYear.fromYear`, `Solar` 타입 선언 보강)
   - `lib/lunarInput.ts` (신규 — `Lunar.fromYmd(y, isLeapMonth ? -m : m, d).getSolar()` 기반 음력→양력 결정론 변환 및 없는 윤달·없는 음력 일자 거부, 안내 문구 생성)
   - `lib/lunarNoticeStorage.ts` (신규 — URL·서버 응답·공유 링크에 생년월일 PII를 싣지 않기 위한 `sessionStorage` 전용 `"음력 ○월 ○일(양력 ○월 ○일)로 봤어요"` 보관 헬퍼)
   - `components/forms/BirthFields.tsx` (`[양력 | 음력]` 토글 + 음력 시 `윤달` 체크박스 `CalendarTypeToggle`, `lunar_toggle` GA4 이벤트, 음력 선택 시 동적 `import("@/lib/lunarInput")`로 435KB 만세력 초기 번들 유입 차단)
   - `components/CompatNewClient.tsx`, `components/CompatInviteClient.tsx`, `components/CompatResultClient.tsx` (궁합·반쪽 초대장 음력 입력 변환 및 결과 카드 안내 1줄 표시)
   - `components/FortuneNewClient.tsx`, `app/[locale]/fortune/annual/AnnualFortuneClient.tsx`, `components/report/ReportNewClient.tsx`, `components/premium/PremiumNewClient.tsx`, `components/report/ReportViewClient.tsx` (개인 운세·총운·프리미엄·재입력 화면 음력 변환 및 결과 화면 1줄 표시)
   - `tests/lunarInput.test.ts` (신규 — 음력 `1990-01-01` → 양력 `1990-01-27`, `2023 윤2월 1일` → `2023-03-22`, 없는 윤달 `"그해에는 윤○월이 없어요"` 거부 등 7개 단위 테스트)
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 통과 (0 errors)
   - `npx eslint` (변경 파일 13개): 통과 (0 errors, 0 warnings)
   - `npx vitest run`: 78 passed / 1 skipped (총 588 tests 통과, 신규 `tests/lunarInput.test.ts` 7개 포함)
   - `npm run build`: 통과 (exit code 0)
3. **직접 화면에서 확인한 것**
   - `/ko/compat/new`, `/ko/compat/invite/[token]`, `/ko/fortune/new`, `/ko/fortune/annual`, `/ko/premium/premium_2027_daeun/new`, `/ko/report/new` 생년월일 라벨 옆에 `[양력 | 음력]` 토글이 배치되고, `음력` 전환 시 `윤달` 체크박스가 함께 노출되며 `lunar_toggle`(`on`/`off`) 이벤트가 발사됨을 확인.
   - 음력 모드에서는 2월에도 30일까지 선택할 수 있고, 해당 연도에 없는 윤달을 고르면 `"그해에는 윤○월이 없어요"` 안내와 함께 제출이 차단됨을 확인.
   - 제출 직전 양력 `YYYY-MM-DD`로 변환해 기존 API 계약과 `lib/saju.ts`를 수정 없이 그대로 재사용하며, 결과 화면 상단에 `"음력 ○월 ○일(양력 ○월 ○일)로 봤어요"` 한 줄이 표시됨을 확인.
4. **스스로 의심하는 점**
   - 결과 안내 문구(`"음력 ○월 ○일(양력 ○월 ○일)로 봤어요"`)에 생일(월·일)이 들어가므로 공유 링크를 열어 보는 제3자에게 노출되지 않도록 서버 DB·응답·URL에는 일절 저장하지 않고 입력한 본인의 탭(`sessionStorage`)에서만 읽어 표시하도록 설계했습니다. 따라서 다른 브라우저나 새 탭에서 공유 링크로 열었을 때는 해당 문구가 보이지 않는데, 개인정보 보호 원칙(§0.6)에 부합하는 의도된 동작입니다.
   - `lib/sajuDisplay.ts` (신규 — `lib/saju.ts`의 `calculateFourPillars` 결과만 읽기 전용으로 받아 한자·전문용어 없이 8칸 쉬운 한글 기운 이름·색, 나무·불·흙·쇠·물 개수, 결정론 매력 기운 배지 `도화(사람을 끄는 매력)`·`홍염(한 번 빠지면 깊은 매력)`·`역마(움직임이 많은)` 계산)
   - `components/saju/SajuEightCharCard.tsx` (신규 — 1인/2인 여덟 글자 8칸 카드·다섯 기운 개수 막대·매력 기운 배지 UI, `saju_card_view` 및 `charm_badge_view` GA4 이벤트 발사, `"use client"` 타입 전용 import 준수)
   - `app/[locale]/compat/[id]/page.tsx` (서버에서 `compat.personA/personB.fourPillars`를 한글 전용 `sajuPeople`로 변환해 클라이언트에 전달, 원본 `fourPillars`/`birthHash` 미노출)
   - `app/api/reports/generate/route.ts`, `app/api/fortune/annual/route.ts` (유료 상품 `TEASER` 및 무료 성격 `FREE` 응답에 결정론 `sajuDisplay` 배열 포함)
   - `components/CompatResultClient.tsx`, `components/CompatNewClient.tsx`, `components/FortuneNewClient.tsx`, `app/[locale]/fortune/annual/AnnualFortuneClient.tsx`, `components/premium/PremiumNewClient.tsx` (무료 궁합 결과·무료 성격 결과·유료 커플/개인/신년/프리미엄 미리보기 맨 위에 `SajuEightCharCard` 배치)
   - `tests/sajuDisplay.test.ts` (신규 — 결정론 동일 입력=동일 카드, 시간 미상 `"모름"` 2칸+기운 합 6, 한자·전문용어·퍼센트·순위 0건 검증, 배지 없음 케이스 및 도화·홍염·역마 판정 경계값 단위 테스트 5건)
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 통과 (0 errors)
   - `npx eslint` (변경 파일 11개): 통과 (0 errors, 0 warnings)
   - `npx vitest run`: 78 passed / 1 skipped (총 586 tests 통과, 신규 `tests/sajuDisplay.test.ts` 5건 포함)
   - `npm run build`: 통과 (exit code 0)
3. **직접 화면에서 확인한 것**
   - 무료 궁합 결과(`/ko/compat/[id]`)와 무료 성격 결과, 유료 상품 미리보기(`/ko/compat/new`, `/ko/fortune/new`, `/ko/fortune/annual`, `/ko/premium/*/new`) 맨 위에 한자 없이 연·월·일·시 8칸 쉬운 기운 카드(`큰 나무`, `촛불`, `바다` 등, 시간 미상이면 시주 2칸 `"모름"`)와 나무·불·흙·쇠·물 개수 막대가 렌더링됨을 확인.
   - 결정론 판정에서 해당하는 기운이 있을 때만 `도화(사람을 끄는 매력)`, `홍염(한 번 빠지면 깊은 매력)`, `역마(움직임이 많은)` 배지가 퍼센트·순위 없이 표시되고 `saju_card_view`와 `charm_badge_view`(배지 이름) 이벤트가 1회 발사됨을 확인.
4. **스스로 의심하는 점**
   - 도화·역마는 전통 삼합 기준에서 연지·일지 두 기준을 모두 확인해 알려진 지지(시간 미상일 때는 시지 제외 3지지) 중 해당 글자가 있을 때만 배지를 부여했고, 기준 글자 자체가 자기 자신을 가리키지 않으므로 과도하게 모든 사람에게 배지가 붙지 않음을 테스트로 검증했습니다.
5. **클로드에게 필요한 것**
   - 없음 (DB 스키마·약관·환경변수 변경 없음)
# REVIEW_HANDOFF — argon/09-invite-push (반쪽 초대장 완성 알림)
# REVIEW_HANDOFF — argon/10-season-events (연말 시즌 기획전)
# REVIEW_HANDOFF — argon/12-set-upgrade (차액만 내고 세트로 바꾸기)
# REVIEW_HANDOFF — argon/13-gift (운세 선물하기)

> **작성 일시**: 2026-10-29
> **기반 브랜치**: `origin/main`

1. **바뀐 파일**
   - `lib/invitePush.ts` (신규): 초대장을 만든 사람이 회원(`creatorId`)이고 `PushSubscription`을 보유한 경우 `"○○님이 반쪽을 채워서 두 분의 궁합이 완성됐어요 💌"` 문구와 `/ko/compat/{shareToken}` 링크로 웹 푸시를 발송하는 `sendInviteCompletedPush` / `buildInviteCompletedPushPayload` 구현(VAPID 미설정·네트워크 오류 시 조용히 건너뛰며 404/410 만료 구독 자동 삭제).
   - `app/api/compat/invite/[token]/route.ts`: 초대장 완성 직후 `sendInviteCompletedPush` 호출 및 `pushSent: boolean` 응답 필드 추가.
   - `lib/compatInviteClient.ts`: 받는 사람 현재 세션 식별용 `markReceivedInviteCompleted` / `isReceivedInviteResult` 추가(개인정보 미저장).
   - `components/CompatInviteClient.tsx`: 완성 시 `pushSent === true`이면 `invite_complete_push_sent` GA4 발사 후 `?via=invite_receiver` 및 세션 플래그와 함께 결과 화면으로 이동.
   - `app/[locale]/compat/[id]/page.tsx` & `components/CompatResultClient.tsx`: 받는 사람 결과 화면 하단에 `"이 사람이 나를 어떻게 생각하는지 궁금하다면 → 그 사람 속마음 보기"` 카드 노출(`nextReadingHref("inner_mind", data.id, locale, "free_result")`로 입력 재사용) 및 클릭 시 `invite_receiver_cta_click` 발사.
   - `tests/invitePush.test.ts` (신규): 알림 문구 규격(과장 문구 배제), 비회원 스킵, 회원 발송 및 410 만료 구독 정리, 푸시 실패 시 완성 응답(200) 보존, 세션 헬퍼 5개 단위 테스트.
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 0 errors
   - `npx eslint` (변경 파일 7개): 0 errors
   - `npx vitest run`: **78 passed | 1 skipped (79)**, **586 passed | 42 skipped (628)**
   - `npm run build`: exit 0
3. **직접 화면에서 확인한 것**
   - 반쪽 초대장 완성 후 결과 화면(`?via=invite_receiver`) 진입 시 하단에 `"이 사람이 나를 어떻게 생각하는지 궁금하다면 → 그 사람 속마음 보기"` 카드가 노출되고, 클릭 시 `/ko/compat/new?productId=inner_mind&from={compatId}&via=free_result`로 이어져 생년월일 재입력 없이 속마음 미리보기로 연결되는 동선과 GA 이벤트(`invite_complete_push_sent`, `invite_receiver_cta_click`) 연결 확인.
4. **스스로 의심하는 점**
   - 주소창에서 `ref` 쿼리를 `history.replaceState`로 동기화할 때도 기존 `via=invite_receiver` 파라미터와 `sessionStorage` 플래그(`useSyncExternalStore` 구독)가 모두 유지되어 하이드레이션 불일치나 새로고침 시 CTA 소실이 없도록 처리했습니다.
5. **클로드에게 필요한 것**
   - 운영 서버 `.env`에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`와 `VAPID_PRIVATE_KEY`(선택: `VAPID_SUBJECT`)가 설정되어 있는지 확인 부탁드립니다(미설정 시 오류 없이 푸시만 건너뜁니다).
   - `lib/seasonEvents.ts` (신규): 연말 기획전 3종(`christmas`, `before-new-year`, `single-2027`)의 기존 상품 묶음·KST 종료 시각(`2026-12-26T00:00:00+09:00` 및 `2027-01-01T00:00:00+09:00`)·실제 남은 일수(`"○일 남음"`)·활성 판정을 단일 파일에서 관리.
   - `components/season/SeasonEventView.tsx` (신규): 활성 기간에는 기획전 헤더·표지 3장·추천 풀이(`ListRowCard` / `SetStackCard`, 새 상품·새 할인 없음)를 보여 주고, 종료 시 자동으로 일반 상품 목록(`ProductsExplorerClient`)으로 전환하며 `season_view` GA4 이벤트를 발사.
   - `app/[locale]/season/[slug]/page.tsx` (신규): `force-dynamic`으로 요청 시각 기준 종료 여부를 판정하고 각 기획전 고유 메타데이터를 생성(`app/sitemap.ts`에는 미포함).
   - `tests/seasonEvents.test.ts` (신규): 3개 기획전 구성·가격 불변 검증, `12/25 23:59 KST` 및 `12/31 23:59 KST` 종료 경계·남은 일수 계산 검증, `sitemap()`에 `/season/` 경로 미포함 검증(4개 단위 테스트).
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 0 errors
   - `npx eslint` (변경 파일 4개): 0 errors
   - `npx vitest run`: **78 passed | 1 skipped (79)**, **585 passed | 42 skipped (627)**
   - `npm run build`: exit 0
3. **직접 화면에서 확인한 것**
   - `/ko/season/christmas`, `/ko/season/before-new-year`, `/ko/season/single-2027` 3개 경로에서 각각 지정된 기존 상품 3종이 정확한 순서로 노출되고 실제 종료일 기준 `"○일 남음"` 배지와 `season_view` 이벤트가 동작하며, 종료 시각 이후에는 일반 상품 목록 화면으로 자동 전환되는지 확인.
4. **스스로 의심하는 점**
   - React Compiler의 `react-hooks/purity` 규칙을 지키기 위해 컴포넌트 렌더 본문에서 직접 `Date.now()`를 호출하지 않고 `evaluateSeasonEventState(event)` 헬퍼를 통해 평가하도록 구성했습니다(`export const dynamic = "force-dynamic"`이므로 매 요청 시점에 서버 시각이 평가됩니다).
5. **클로드에게 필요한 것**
   - 광고 단축 주소(`/ko/go/tt-xmas*` 등) 연결용 기획전 화면 경로:
     - 크리스마스 기획전(12/25 23:59 KST 종료): `/ko/season/christmas`
     - 연말 정리·재회 기획전(12/31 23:59 KST 종료): `/ko/season/before-new-year`
     - 2027 솔로·연애 기획전(12/31 23:59 KST 종료): `/ko/season/single-2027`
   - `prisma/schema.prisma` & `prisma/sql/argon_12_set_upgrade.sql` (신규): `Order` 모델에 `upgradeFromOrderId String?` 컬럼 및 `@@index([upgradeFromOrderId])` additive 추가
   - `lib/payments/setUpgrade.ts` (신규): 24시간 업그레이드 윈도우·최소 100원 차액 계산(`Math.max(100, setPrice - paidAmount)`)·안내 문구 생성(`"이미 낸 4,900원은 빼고 3,000원만 내면 세트로 바뀌어요"`)·6가지 필수 검증(`validateSetUpgrade`: 같은 소유자[회원 `userId` 또는 비회원 `orderId` 토큰], `PAID`, 24시간 이내, 같은 `compatId`, 세트 내 단품 포함 여부, 이중 업그레이드 방지) 및 결제 완료/웹훅 재검증(`verifyUpgradeSettlement`)
   - `app/api/payments/order/route.ts`: `upgradeFromOrderId` 수신 시 서버 검증 수행, 클라이언트 전달 금액 무시 및 쿠폰 중복 차감 차단, `upgradeFromOrderId` 저장
   - `app/api/payments/complete/route.ts` & `app/api/webhooks/portone/route.ts`: 업그레이드 주문에 대해 `verifyUpgradeSettlement`로 차액 및 원본 주문 조건 재검증 후 `applyPaidOrder` 반영(`complete` 응답에 `upgrade: true` 포함)
   - `lib/payments/grant.ts`: `applyPaidOrder` 트랜잭션 안에서 동일 `upgradeFromOrderId` 이중 `PAID` 경쟁 조건을 원자적으로 차단하고, 세트 `Unlock`을 같은 `compatId`로 부여(기존 단품 `Unlock` 유지)
   - `app/api/payments/upgrade-offer/route.ts` (신규): 단품 결제 후 24시간 내 업그레이드 가능한 세트 목록을 차액 오름차순으로 조회
   - `components/payments/SetUpgradeBanner.tsx` (신규), `components/GuestCheckoutModal.tsx`, `lib/payments/client.ts`: 결제 완료 화면 및 단품 리포트 하단 업그레이드 배너(`upgrade_offer_view`, `upgrade_offer_click`), 업그레이드 결제 시 `disableCoupon` 적용 및 `purchase` 이벤트에 `upgrade: true` 전송
   - `app/[locale]/pay/complete/page.tsx`, `components/report/ReportViewClient.tsx`, `components/CompatResultClient.tsx`, `app/[locale]/fortune/annual/AnnualFortuneClient.tsx`: 결제 완료 화면과 단품 리포트 열람 하단에 `SetUpgradeBanner` 연결
   - `tests/setUpgrade.test.ts` (신규): 남의 주문 거부, 24시간 초과 거부, 서버 금액 계산(클라이언트 금액 무시·최소 100원), 이중 업그레이드/다른 `compatId`/미포함 세트 거부, 웹훅 및 완료 라우트 금액 검증·세트 `Unlock` 발급 단위 테스트 5종
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 0 errors
   - `npx eslint`: 0 errors
   - `npx vitest run`: 78 files passed, 586 tests passed (42 skipped)
   - `npm run build`: exit 0
3. **직접 화면에서 확인한 것**
   - 프로덕션 빌드에서 `/api/payments/upgrade-offer`, `/api/payments/order`, `/api/payments/complete`, `/api/webhooks/portone`, `/[locale]/pay/complete`, `/[locale]/report/[reportId]` 라우트 정상 생성 및 `tests/visibilityUsage.test.ts`·`tests/clientPromptLeak.test.ts` 가드 통과 확인
4. **스스로 의심하는 점**
   - 비회원이 구매 직후 카카오 로그인으로 세션을 얻은 뒤 아직 `claim-device-orders`가 완료되지 않은 상태에서 업그레이드를 시도할 수 있어, 원본 주문이 비회원(`userId === null`)일 때는 기기가 보유한 `orderTokens`에 해당 `orderId`가 포함되어 있는지 함께 확인하도록 구현했습니다.
5. **클로드에게 필요한 것**
   - 프로덕션 DB 반영 필요(additive SQL): `prisma/sql/argon_12_set_upgrade.sql` (`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "upgradeFromOrderId" TEXT;` 및 인덱스 생성).
   - `prisma/schema.prisma` & `prisma/sql/argon_13_gift.sql` (신규): `GiftCode` 테이블(`id`, `code @unique`, `catalogId`, `purchaseOrderId @unique`, `senderNickname`, `recipientNickname`, `message`, `used @default(false)`, `redeemedOrderId`, `redeemedAt`, `expiresAt`, `createdAt`) 및 `Order.giftCode` 관계 additive 추가
   - `lib/giftCopy.ts` (신규): 클라이언트 안전 선물 문구 포매터(`formatGiftHeadline` — 받침 판별 조사 포함 `"○○님이 2027 신년운세를 선물했어요"`) 및 90일 기한 상수(`GIFT_EXPIRY_DAYS = 90`)
   - `lib/payments/gift.ts` (신규): 128비트 암호학적 난수 코드 생성(`generateGiftCode`), 선물 입력 검증(`validateGiftCreateInput`), 트랜잭션 + `updateMany({ where: { id, used: false, expiresAt: { gt: now } } })` 원자적 1회 수령 처리(`redeemGiftCode`, 미결제 `402`·상품 불일치 `400`·만료 `410`·중복 사용 및 동시성 경쟁 `409` 거부, 보낸 사람과 완전히 분리된 수령인 전용 `Order(amount: 0, provider: "gift_redeem")` + `Unlock` 생성)
   - `app/api/payments/order/route.ts`, `lib/payments/grant.ts`, `app/api/payments/complete/route.ts`, `lib/payments/client.ts`, `components/GuestCheckoutModal.tsx`: 선물 주문(`isGift: true`) 정가 결제(쿠폰 차감 비활성화, 커플 상품도 선물 구매 시점에는 `compatId` 불요), 결제 완료(`applyPaidOrder`) 시 보낸 사람 `Unlock` 미발급 및 `expiresAt`을 실제 결제 시각 기준 +90일로 갱신, `gift_purchase` GA 이벤트 발사
   - `app/api/gift/[code]/route.ts` (신규) & `app/api/gift/[code]/redeem/route.ts` (신규): 선물 코드 상태 조회(`GET`, 보낸 사람 이메일/전화/생년월일 미노출) 및 수령인 직접 입력 기반 1회 수령(`POST`)
   - `app/[locale]/gift/[code]/page.tsx` (신규), `components/gift/GiftRedeemClient.tsx` (신규), `components/gift/GiftPurchaseButton.tsx` (신규), `components/gift/GiftShareCard.tsx` (신규), `components/premium/PremiumNewClient.tsx`: 선물 수령 페이지(`gift_open`, `gift_redeem`, 개인/커플 생년월일 수령인 직접 입력 및 작명·택일 프리미엄 입력 화면 `ownedOrderToken` 연동), 선물하기 입력 시트(`gift_click`) 및 카카오톡·공유 시트·링크 복사 카드
   - `components/product/StandardProductDetail.tsx`, `components/premium/PremiumProductDetail.tsx`, `app/[locale]/pay/complete/page.tsx`: 단품·세트·프리미엄 상품 화면 및 결제 완료 화면에 "선물하기" 버튼 배치, 모바일 리다이렉트 선물 결제 완료 시 공유 카드 즉시 노출
   - `app/[locale]/admin/page.tsx` & `app/[locale]/admin/AdminDashboard.tsx`: 관리자 주문 목록에 선물 주문 상태 배지(`"선물 미사용 — 환불 대상"` / `"선물 사용됨"` / `"선물 수령"`) 표시
   - `tests/gift.test.ts` (신규): 128비트 코드·조사 문구 검증, 두 번 사용 거부(`409`), 만료 거부(`410`), 다른 상품으로 사용 거부(`400`), 미결제/취소 코드 거부(`402`), 동시성 경쟁(`updateMany count=0` → `409`) 단위 테스트 6종
2. **테스트 결과(통과 수)**
   - `npx tsc --noEmit`: 0 errors
   - `npx eslint`: 0 errors
   - `npx vitest run`: 78 files passed, 587 tests passed (42 skipped)
   - `npm run build`: exit 0
3. **직접 화면에서 확인한 것**
   - 프로덕션 빌드에서 `/[locale]/gift/[code]`, `/api/gift/[code]`, `/api/gift/[code]/redeem`, `/[locale]/products/[id]`, `/[locale]/pay/complete`, `/[locale]/admin` 라우트 정상 생성 및 `tests/clientPromptLeak.test.ts`·`tests/launchPaymentMatrix.test.ts` 통과 확인
4. **스스로 의심하는 점**
   - 보낸 사람이 선물 결제 직후 같은 브라우저에서 선물 링크를 열어보더라도 생년월일 정보가 전혀 들어 있지 않고, 받는 사람이 자신의 기기에서 직접 생년월일을 입력해 수령할 때만 수령인 기기(또는 로그인 계정)에 `gift_redeem` 주문 토큰과 `Unlock`이 발급되어 보낸 사람은 받는 사람의 생년월일이나 리포트를 열람할 수 없도록 격리했습니다.
   - 작명(`child_naming`)·택일(`date_selection`) 프리미엄 상품을 선물받은 경우 수령 직후 `/ko/premium/[id]/new`로 이동하며, 수령으로 발급된 `redeemedOrderId`를 기기 `orderTokens`에 저장하고 `PremiumNewClient`가 `/api/payments/owned`에서 보유 주문 토큰을 자동으로 읽어 추가 결제 없이 바로 리포트를 생성하도록 연결했습니다.
5. **클로드에게 필요한 것**
   - 법률 문구(`messages/ko.json` `Legal.*`): 이용약관·개인정보처리방침에 **선물 조항 필요**(운세 선물하기 1회성 코드, 결제일로부터 90일 사용 기한, 미사용 선물 환불 기준 및 수령인 직접 입력 안내).
   - 프로덕션 DB 반영 필요(additive SQL): `prisma/sql/argon_13_gift.sql` (`GiftCode` 테이블 및 인덱스 생성).

---

# REVIEW_HANDOFF — P-018 (홈 진열 + 결제 버튼 정리)

> **작성 일시**: 2026-10-25
> **범위**: `docs/uiux/decisions/P-018.md` §1~§5 (홈 큰 카드 PC 좌우 화살표·점 인디케이터 → 홈 큰 카드 4장 구성 및 2026-12-01 KST 자동 전환 + 대운 배지 2개·특가가 → 포스터 카드 4:5 사진 위·글 아래 분리 → `HOME_GRID_ORDER` 홈·전체 목록 진열 순서 → 결제 창 네이버페이 바로가기 숨김 및 카카오페이 최상단 배치)
> **검증 상태**: `npx tsc --noEmit` 0 errors · 변경 파일 `eslint` 0 errors · `npm test` 74파일 551개 통과(1 skip) · `npm run build` exit 0
> **DB 변경 (SQL)**: 없음

## 1. 변경 파일과 이유

| 파일 | 이유 |
|---|---|
| `components/home/HomeHeroCompact.tsx` | **[P-018 §1·§2]** ① 마우스 화면(`[@media(hover:hover)_and_(pointer:fine)]`) 전용 좌우 40px 원형 `‹` `›` 버튼(`aria-label="이전 카드"` / `"다음 카드"`, 첫/마지막 장 흐리게+비활성) 및 모바일·PC 공통 하단 점 4개(현재 코랄 길쭉, 나머지 흰색 30%) 추가, `home_hero_nav { via: "arrow" \| "dot", to }` 이벤트 발사 ② 슬라이드 4장을 **① 속마음(`inner_mind`) ② 2027 신년운(`annual_2027`) ③ 2027 대운(`premium_2027_daeun`) ④ 정통 궁합(`compat_basic`)**으로 교체(솔로·재회 제거) ③ `getHeroPosterSlides(now)`로 `2026-12-01 00:00 KST`부터 ②가 첫 장(②①③④)으로 자동 전환 ④ 대운 카드에 금색 배지 2개(`프리미엄` + `연말 특가 · 12/31까지`) 및 `product.originalPrice`/`product.price`(`seasonPriceAt`) 기반 `19,900원` 취소선 + `9,900원` 표시(특가 종료 시 취소선·특가 배지 자동 소멸) |
| `components/cards/KongdakCards.tsx` | **[P-018 §3]** `PosterCard`를 위쪽 **4:5(`aspect-[4/5]`) 표지 영역**(어두운 그라데이션 덮개 제거, 사진 위엔 배지만 표시) + 아래쪽 **별도 어두운 칸(`#22142A`, 고정 높이 `h-[84px]`)** 구조로 변경. 아래 칸에 제목 1줄(15px 굵게) + 설명 1줄(`line-clamp-1`, 12px) + 우하단 가격(11px `#B9A9BF`, 무료는 `"무료"`, 특가는 취소선 원가 + 금색 `#FFC24B` 특가가) 배치. 카드 안 `"무료 미리보기"` / `"지금 바로 무료"` 문구 제거. 특가 중인 프리미엄 상품도 `프리미엄` 배지를 함께 표시하도록 수정 (`SetStackCard`는 그대로 유지) |
| `lib/home/explore.ts` | **[P-018 §4]** `featuredOrder` 값은 건드리지 않고, 새 상수 `HOME_GRID_ORDER` (첫 2개 `annual_2027`, `premium_2027_daeun` → 연애/궁합 → 재물/직업/건강/매운맛/프리미엄 → `annual_2026` → 마지막 `free_personality`) 및 `sortByHomeGridOrder` 추가. `"전체"` 칩과 각 카테고리 칩 모두 `HOME_GRID_ORDER` 상대 순서 유지(목록에 없는 상품은 뒤에 `featuredOrder` 순) |
| `components/home/HomeExplore.tsx` & `components/product/ProductsExplorerClient.tsx` | **[P-018 §2·§3·§4]** `PRODUCT_COVER_MAP`을 새 히어로 4장 구성으로 갱신하고, 홈 목록 제목 줄 오른쪽에 작은 글씨 `"모든 풀이 무료 미리보기"` 1회 표시, 단품·프리미엄 목록 정렬에 `sortByHomeGridOrder` 적용(세트 목록 순서와 `"지금 많이 보는 사주 TOP 5"` 실제 집계는 그대로 유지) |
| `components/GuestCheckoutModal.tsx` | **[P-018 §5]** `export const SHOW_NAVERPAY_SHORTCUT = false; // 10-25 0/4 성공, 원인 확인 전까지`로 네이버페이 바로가기 버튼을 숨기고(코드는 유지, 상단 `PAY_METHODS` 배지 줄의 네이버페이 표시는 유지), PC·모바일 모두 **카카오페이 바로가기 버튼(가장 크고 맨 위, 노란색 `#FEE500`)** → 그 아래 작은 보조 버튼 **"카드·네이버페이·삼성페이로 결제"** 순서로 통일 |
| `tests/p016Design.test.ts` & `tests/p018HomeAndPay.test.ts` (신규) | **[P-018 검증]** 히어로 4장 구성, `2026-11-30 23:59` / `2026-12-01 00:00 KST` 경계 자동 전환, 대운 카드 배지 2개 및 `2027-01-01` 특가 종료 시 취소선 소멸, `HOME_GRID_ORDER` 정렬(첫 2개 = 2027 두 개, 마지막 = `free_personality`, `featuredOrder` 불변), `SHOW_NAVERPAY_SHORTCUT === false` 단위 테스트 추가 |

## 2. 결정론 로직 요약
- 사주·궁합 엔진(`lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts`), `featuredOrder` 값, 가격·결제 금액 계산 로직(`app/api/payments/order/route.ts`, `SEASON_PROMO_*`) 수정 없음.
- `getHeroPosterSlides(now)`는 `HERO_2027_FIRST_FROM` (`Date.parse("2026-12-01T00:00:00+09:00")`) 경계 시각만 비교해 슬라이드 배열 순서를 결정론적으로 반환함.
- `getHeroSlideMeta(productId, now)`는 카탈로그의 `price` / `originalPrice` (`seasonPriceAt`)와 `isOnSeasonPromo`만 읽어 배지와 취소선 여부를 결정론적으로 반환함.

## 3. 보안 · PII · 결제 · 이벤트 변경점
- 서버(`app/api/payments/order/route.ts`)의 `NAVERPAY` 허용 및 결제 금액 계산 로직 변경 없음.
- 기존 `home_hero_cta_click`, `select_item`, `checkout_open`, `checkout_submit`, `compat_created`, `teaser_created` 이벤트 유지.
- 신규 GA4 이벤트: `home_hero_nav { via: "arrow" | "dot", to }`.

## 4. 스스로 의심 지점
- PC 화면에서 `[카카오페이로 결제]` 바로가기 버튼을 눌렀을 때도 이니시스 PC 필수값(이름·휴대폰·이메일) 검증을 거친 뒤 `payMethod: "KAKAOPAY"`로 제출되도록 `handleSubmit`의 `const payMethod = methodRef.current;`를 연결했습니다.

---

# REVIEW_HANDOFF — P-017 ("콩닥 나이트" 전체 디자인 통일 — 로그인 전·후 전체)

> **작성 일시**: 2026-10-24
> **범위**: `docs/uiux/decisions/P-017.md` 전체 (표지 15장 신규 생성·최적화 → 콩닥 나이트 색 토큰 → 공통 카드 3종·리퀴드 글래스 독·비로그인 첫 방문 시트 → 홈 4섹션 통일 → 상품 상세·입력·무료 결과·결제 창·완료·보관함·리포트·로그인 전 화면 다크 톤 통일)
> **검증 상태**: `tsc --noEmit` 0 errors · 변경 파일 `eslint` 0 errors · `vitest` 73파일 544개 통과(1 skip) · `npm run build` exit 0
> **DB 변경 (SQL)**: 없음

## 1. 변경 파일과 이유

| 파일 | 이유 |
|---|---|
| `public/covers/cover_{compat_basic,marriage,conflict,cheating,secret_love,charm,career,wealth,health,annual_2026,spicy_annual,free_personality,premium_2027_daeun,premium_naming,premium_date_pick}.webp` (15장 신규) | **[P-017 §2]** `SNS/광고영상_2026-10/참조이미지/doogeun_cat_canon.png` 참조 + P-017 표지 프롬프트로 15장 모두 생성 후 3:4(`900×1200`), 23KB~69KB(`<= 300KB`) `.webp`로 저장. 글자·숫자·로고 없음, 하단 1/3 타이틀 오버레이용 어두운 여백 확보 |
| `lib/catalog.ts` | **[P-017 §2]** `CatalogItem.cover` 필드, 단품·프리미엄 19개 전체의 표지 경로 반환 헬퍼 `getProductCover()`, 세트 4종에 포함된 단품 표지 2~3장 배열을 반환하는 `getSetCoverStack()` 추가 |
| `app/globals.css` & `app/[locale]/layout.tsx` | **[P-017 §1]** 콩닥 나이트 단일 팔레트(`--kd-bg: #140B18`, `--kd-card: #22142A`, `--kd-line: rgba(255,255,255,0.08)`, `--kd-text: #F6EEF3`, `--kd-sub: #B9A9BF`, `--coral: #FF5C77`, `--gold: #FFC24B`) 및 `<meta name="theme-color" content="#140B18" />` 적용, 레거시 밝은 유틸리티를 다크 토큰으로 오버라이드 |
| `components/cards/KongdakCards.tsx` (신규) | **[P-017 §3]** 사이트 전체가 공유하는 3가지 카드 컴포넌트(`PosterCard` 3:4 포스터 카드, `ListRowCard` 정사각 표지 썸네일 행 카드, `SetStackCard` 단품 표지 2~3장 겹침 세트 카드) 및 이미지 로드 실패 시 두근이 마스코트 폴백 구현 (`select_item` 이벤트 유지) |
| `components/MobileBottomTabBar.tsx` | **[P-017 §4]** 진짜 반투명 리퀴드 글래스 하단 독(`bg-[#180E20]/60 backdrop-blur-xl border border-white/20 rounded-full`) 및 5탭(`홈` · `궁합` · `신년·운세` · `전체(/products)` · `보관함(/me)`) 적용, 활성 탭 알약(`bg-white/15 border-white/25`), `dock_tab_click` 이벤트 발사. 하단 고정 CTA 바가 있는 상세/입력/결과 경로에서는 숨김 유지 |
| `components/Navbar.tsx` | **[P-017 §5]** 상단 바를 `bg-[#140B18]/80 backdrop-blur-md`로 통일하고, 햄버거 서랍에서 하단 독과 겹치는 상품 나열을 제거하여 계정·지원 메뉴(`내 쿠폰함`, `이용 안내`, `고객센터(카카오 채널)`, `약관·개인정보`, `로그인/로그아웃`)만 깔끔하게 구성 |
| `lib/welcome.ts` (신규), `components/WelcomeLoginSheet.tsx` (신규), `app/api/auth/[...nextauth]/route.ts` | **[P-017 §6]** 비로그인 첫 방문 시 1회 하단 시트(두근이 + 사실 기반 3줄 혜택 + 노란 카카오 3초 시작 버튼 `#FEE500` + `24시간 동안 안 보기` / `먼저 둘러볼게요`) 노출(`welcome_sheet_view`, `welcome_sheet_login_click`, `welcome_sheet_dismiss`). `WELCOME_COUPON_AMOUNT = 0` 기본값 유지 및 `> 0` 변경 시 자동 가입 쿠폰 발급 훅 연결 |
| `app/[locale]/page.tsx`, `lib/home/explore.ts`, `components/home/{HomeHeroCompact,HomeRankingView,HomeExplore,TrustBanner}.tsx` | **[P-017 §7]** 로그인 전·후 모두 동일한 4섹션 다크 홈으로 통합: ① 상단 카테고리 칩 6개 + 폭 86% 3:4 포스터 슬라이드 4장 ② 지금 많이 보는 사주 TOP 5(`ListRowCard`, 집계 0건 시 섹션 자동 숨김) ③ 고민별 2열 3:4 `PosterCard` 그리드 + `SetStackCard` 모음 ④ 실제 구매자 후기 피드(`ProductReviewsSection` + 해당 상품 `ListRowCard`, 후기 0개 시 숨김). 로그인 회원은 맨 위에 1줄 요약 바(`"OO님 · 쿠폰 N장 · 이어보기 →"`)만 추가 |
| `app/[locale]/products/page.tsx` (신규) & `components/product/ProductsExplorerClient.tsx` (신규) | **[P-017 §4·§7]** 하단 독 `"전체"` 탭(`/products`) 전용 전체 상품 탐색 페이지(카테고리 칩 필터 + 2열 `PosterCard` + `SetStackCard`) 추가 |
| `lib/reviews.ts` & `components/product/ProductReviewsSection.tsx` | **[P-017 §7 ④]** 홈 전체 후기 피드 조회용 `getRecentPublicReviews(limit)` 추가 및 후기 카드 아래에 해당 상품의 `ListRowCard` 연결(후기 0개면 `null` 반환) |
| `components/product/{StandardProductDetail,SetUpsell}.tsx` & `components/premium/PremiumProductDetail.tsx` | **[P-017 §8]** 상품 상세 상단을 3D 아이콘 박스에서 3:4 표지 포스터 헤더(세트 상품은 단품 표지 겹침 헤더)로 교체하고, 샘플 미리보기·세트 비교(`SetStackCard`)·하단 고정 CTA 바를 콩닥 나이트 다크 토큰으로 통일 |
| `components/GuestCheckoutModal.tsx` & `app/[locale]/pay/complete/page.tsx` | **[P-017 §8]** 결제 모달 상단에 주문 상품의 정사각 표지 썸네일(`getProductCover`) 표시, 쿠폰 자동 적용 박스·결제 수단 버튼·중단 복귀 배너·결제 완료 페이지를 다크 톤으로 통일 |
| `components/ui/{Card,ReportSection,Button,ScoreGauge,Tag}.tsx`, `components/report/*`, `components/{MeClient,CompatNewClient,CompatResultClient,FortuneNewClient,FortuneLoading,GuestKeepBanner,OwnedReportNotice}.tsx`, `components/forms/BirthFields.tsx`, `components/member/*`, `app/[locale]/{me,login,compat/new,compat/[id],fortune/new,fortune/annual,report/[reportId],report/new}/**` | **[P-017 §1·§8]** 입력·미리보기·무료 궁합 결과·리포트 열람·보관함·로그인 화면의 밝은 크림/흰색 카드를 모두 콩닥 나이트(`#140B18` / `#22142A` / `#F6EEF3` / `#B9A9BF`)로 통일하고, 유료·프리미엄 리포트 상단에 해당 상품의 3:4 표지 배너 추가 |
| `tests/p017Design.test.ts` (신규) | **[P-017 검증]** 카탈로그 19개 단품·프리미엄 상품의 `.webp` 표지 존재 및 300KB 이하 검증, 세트 상품 `getSetCoverStack` 검증, `WELCOME_COUPON_AMOUNT === 0` 및 쿠폰 발급 로직 검증, 5탭 리퀴드 글래스 독 및 6개 홈 카테고리 칩 필터 검증 |

## 2. 결정론 로직 요약
- 사주·궁합 엔진(`lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts`) 및 `lib/compatPercentile.ts` 수정 없음.
- `getProductCover` 및 `getSetCoverStack`은 카탈로그 ID에 매핑된 정적 `.webp` 표지 경로만 결정론적으로 반환함.
- `WELCOME_COUPON_AMOUNT`는 `0`으로 고정되어 있어 현재 가입 쿠폰을 발급하지 않으며, 추후 양수(예: `1000`)로 변경할 때만 `WELCOME-${userId}` 코드로 1회 발급됨.

## 3. 보안 · PII · 결제 · 이벤트 변경점
- 결제·가격·쿠폰 할인 계산(`app/api/payments/*`) 및 주문 로직 변경 없음.
- `compat_created` · `teaser_created` 이벤트 발사 시점 및 조건 변경 없음.
- 신규 GA4 이벤트: `dock_tab_click`, `welcome_sheet_view`, `welcome_sheet_login_click`, `welcome_sheet_dismiss`.

## 4. 스스로 의심 지점
- `public/covers/*.webp` 19장 모두 `900×1200`(3:4), 23KB~92KB로 300KB 이하이며, 혹시라도 네트워크 오류로 표지 이미지 로드가 실패할 경우에는 `KongdakCards.tsx`와 `HomeHeroCompact.tsx`의 `onError` 폴백이 어두운 플럼 그라디언트 배경 위 두근이 마스코트 + 카테고리 라벨을 보여주어 레이아웃이 깨지지 않습니다.

---

# REVIEW_HANDOFF — P-016-5 (홈·리포트 디자인 개편)

> **작성 일시**: 2026-10-24
> **범위**: `docs/uiux/decisions/P-016.md` §P-016-5 (홈 상단 포스터 슬라이드 4장 · `HomeExplore` 2칸 포스터 카드 + 대표 카드 플럼 그라데이션 · 모바일 하단 떠 있는 탭바 · 리포트 섹션 첫 줄 "한 줄 결론" 말풍선 + 기존 점수 게이지)
> **검증 상태**: `tsc --noEmit` 0 errors · 변경 파일 `eslint` 0 errors · `vitest` 72파일 539개 통과(1 skip) · `npm run build` exit 0
> **DB 변경 (SQL)**: 없음

## 1. 변경 파일과 이유

| 파일 | 이유 |
|---|---|
| `components/home/HomeHeroCompact.tsx` | **[P-016-5 §1·§3]** 딥 플럼(`#3A1B40 → #6A2C70`) 그라데이션 + 골드(`#FFC24B`) 포인트 히어로로 개편. 커플 전용처럼 보이지 않도록 상단 카피를 `"솔로 연애 · 재회 · 속마음 · 2027 신년운"` / `"지금 내 마음, 어떤 답이 가장 궁금한가요?"`로 바꾸고, `public/covers/cover_{love_single,reunion,inner_mind,2027}.webp` 세로 3:4 포스터 슬라이드 4장 + 상황별 질문 문구(`"올해 안에 나도 연애할 수 있을까?"`, `"헤어진 그 사람, 다시 닿을 수 있을까?"` 등) + 상황 칩·인디케이터 추가 (이미지 로드 실패 시 3D 아이콘 폴백). 기존 `home_hero_cta_click` 이벤트 유지 |
| `components/home/HomeExplore.tsx` | **[P-016-5 §2·§3]** ① 대표 추천 카드(`picks`) 및 프리미엄 스트립에 딥 플럼(`#3A1B40 → #6A2C70`) 그라데이션 + 골드 포인트 적용 ② 기존 4칸 작은 격자(`grid-cols-4`)를 **2칸 포스터 카드(`grid-cols-2`)**로 변경하여 상단 표지(`PRODUCT_COVER_MAP` 매핑 `.webp` 또는 3D 아이콘 임시 표지) + 제목 + `hook` 2줄 + `"무료 미리보기"` 노출. 기존 `home_card_click` · `home_tab_click` 이벤트 유지 |
| `app/[locale]/page.tsx` & `components/Navbar.tsx` | **[P-016-5 §3]** 홈 배경을 따뜻한 크림(`bg-cream`, `#FFF6F1`)으로 유지하고 `overflow-x-hidden`으로 390px 폭 가로 스크롤 방지. 홈 상단 `Navbar` 배경도 크림(`#FFF6F1`)으로 통일 |
| `components/MobileBottomTabBar.tsx` (신규) & `app/[locale]/layout.tsx` & `components/home/HomeStickyCta.tsx` | **[P-016-5 §4]** 모바일 전용(`sm:hidden`) 하단 떠 있는 탭바(`홈` / `궁합` / `내 운세` / `보관함`) 추가(`mobile_tab_click` 이벤트). 기존 하단 고정 버튼이 있는 경로(`/products/*`, `/compat/*`, `/fortune/new`, `/fortune/annual`, `/premium/*`, `/pay/*`, `/checkout/*`)에서는 자동 비노출(`shouldShowMobileTabBar`)하고, 홈에서는 `HomeStickyCta`를 `hidden sm:block`으로 두어 모바일에서 버튼이 절대 겹치지 않도록 처리 |
| `lib/reportSectionLead.ts` (신규) | **[P-016-5 §5]** 리포트 섹션 본문에서 첫 문장(`"한 줄 결론"` 말풍선용)과 나머지 본문을 분리하는 순수 함수 `splitLeadSentence` 및 기존 점수(0~100)를 게이지 바 너비(%)로 변환하는 `clampGaugePercent` 구현 |
| `components/report/StandardReportView.tsx` | **[P-016-5 §5]** 전체(`full`) 및 미리보기(`teaser`) 각 섹션 상단에 첫 줄 `"한 줄 결론"` 말풍선 노출 + 상단 기존 `score`에 가로 게이지 바 추가 (새 점수 생성 없음) |
| `app/[locale]/fortune/annual/AnnualFortuneClient.tsx` | **[P-016-5 §5]** 신년 총운 5대 영역(`data.sections`)의 각 섹션에 **이미 존재하는 `sec.score`** 가로 게이지 바 및 첫 줄 `"한 줄 결론"` 말풍선 추가 (새 점수 생성 없음) |
| `components/CompatResultClient.tsx` | **[P-016-5 §5]** 심층 궁합(`deepReport`)의 `coreDynamic` · `actionableAdvice` 섹션 첫 줄에 `"한 줄 결론"` 말풍선 추가 (기존 5축 게이지 그대로 유지) |
| `tests/p016Design.test.ts` (신규) | 포스터 슬라이드 4장 `.webp` 파일 존재 및 문구 검증, `shouldShowMobileTabBar` 경로별 노출/숨김 검증, `splitLeadSentence` · `clampGaugePercent` 단위 테스트 4건 |

## 2. 결정론 로직 요약
- 사주·궁합 엔진(`lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts`) 및 `lib/compatPercentile.ts` 수정 없음.
- 리포트 섹션의 `"한 줄 결론"` 추출(`splitLeadSentence`)은 기존 AI 본문의 첫 문장만 분리하며, 본문이 단문 1문장일 때는 중복 표시를 피하기 위해 `lead = null`을 반환함.
- 게이지는 이미 존재하는 점수(`StandardReportView`의 `score`, `AnnualFortuneClient`의 `sec.score`, `CompatResultClient`의 `publicBreakdown`/`breakdown`)만 시각화하며 새로운 점수를 일절 생성하지 않음.

## 3. 보안 · PII · 결제 · 이벤트 변경점
- 결제·가격·주문·쿠폰 로직 변경 없음.
- 기존 `home_hero_cta_click`, `home_card_click`, `home_tab_click`, `compat_created`, `teaser_created` 이벤트 발사 시점 및 파라미터 유지.
- 추가된 GA4 이벤트: `home_hero_slide_tab`, `mobile_tab_click`.

## 4. 스스로 의심 지점
- `MobileBottomTabBar`는 기존 하단 고정 CTA 바가 있는 상세/결과/입력 페이지(`/products/*`, `/compat/*`, `/fortune/new`, `/fortune/annual`)에서는 숨겨지고, 홈(`/`), 보관함(`/me`, `/dashboard`), 리포트 열람(`/report/*`), 띠 궁합(`/zodiac`) 등에서 노출됩니다.

---

# REVIEW_HANDOFF — P-016-4 (후기 + 1,000원 다음 구매 쿠폰 + N번째 구매 배지)

> **작성 일시**: 2026-10-24
> **범위**: `docs/uiux/decisions/P-016.md` §P-016-4 (후기 + 다음 구매 쿠폰 + N번째 구매 배지)
> **검증 상태**: `tsc --noEmit` 0 errors · 변경 파일 `eslint` 0 errors (1 warning은 P-016-1 `checkPending` 내 기존 `window.location.href`) · `vitest` 71파일 535개 통과(1 skip) · `npm run build` exit 0

## 0. 운영 DB 반영용 SQL (Claude 선행 적용용 — `prisma db push` / `migrate` 미실행)

```sql
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "displayOk" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX IF NOT EXISTS "Review_catalogId_displayOk_createdAt_idx" ON "Review"("catalogId", "displayOk", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1000,
    "ownerKey" TEXT NOT NULL,
    "usedOrderId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_ownerKey_expiresAt_idx" ON "Coupon"("ownerKey", "expiresAt");
CREATE INDEX IF NOT EXISTS "Coupon_usedOrderId_idx" ON "Coupon"("usedOrderId");
```

## 1. 변경 파일과 이유

| 파일 | 이유 |
|---|---|
| `prisma/schema.prisma` | `Review` (`orderId @unique`, `catalogId`, `rating`, `text`, `displayOk`, `createdAt`) 및 `Coupon` (`code @unique`, `amount` 기본 1000, `ownerKey`, `usedOrderId`, `expiresAt`, `createdAt`) additive 모델 추가 (`prisma generate`만 실행, DB 미반영) |
| `lib/couponsClient.ts` (신규) | 클라이언트 안전 헬퍼(서버 전용 모듈 미참조): `rememberDeviceCoupon`, `recallDeviceCoupon`(만료 검사), `clearDeviceCoupon`, `collectDeviceOrderTokens`(`kongdak_order_*` / `kongdak_unlock_*` / `kd_last_order_*` 및 쿠폰 `ownerToken` 수집) |
| `lib/reviews.ts` (신규) | 서버 전용 후기·쿠폰 도메인 로직: `hashGuestOrderToken`(SHA-256), `couponOwnerKeyForOrder`(회원 `userId` 또는 비회원 주문 토큰 SHA-256 해시), `validateReviewInput`(별점 1~5 정수, 2~200자), `deriveZodiacBadge`(`lib/seo/zodiac.ts` 재사용), `calculateDiscountedAmount`(`basePrice - 1000`), `findUsableCoupon`, `getPublicReviewsForCatalog`(실제 누적 `PAID` 주문 수로 `"N번째 구매"` 계산) |
| `app/api/reviews/route.ts` (신규) | `GET`: 리포트별 후기 작성 가능 여부(`firstViewedAt != null && !existing`) 및 상품별 `displayOk: true` 후기 목록 반환. `POST`: `report.kind === "FULL"`, `report.firstViewedAt != null`, `order.status === "PAID"`, `orderGrants` 통과, `Review.orderId` 미존재 검증 후 단일 트랜잭션으로 `Review` 1건 + 1,000원 `Coupon`(30일 유효) 1장 발급 |
| `app/api/coupons/available/route.ts` (신규) | 결제 모달 오픈 시 회원 세션 또는 기기 주문 토큰으로 사용 가능한 미사용·미만료 1,000원 쿠폰 조회 |
| `app/api/payments/order/route.ts` | **[P-016-4 §3]** 서버에서만 쿠폰 유효성·소유권(`ownerKey`) 검증 후 `Order.amount = catalogItem.price - 1000`으로 저장하고 `Coupon.usedOrderId = orderId`로 선점. 응답의 `amount`(= PortOne 결제 요청 금액)도 서버 계산 금액과 일치 |
| `lib/payments/client.ts` | `/api/payments/order` 호출 시 기기에 저장된 `couponCode`와 `guestOrderTokens`를 함께 전달하고, 서버가 반환한 `orderData.amount`로 PortOne 결제창 호출 |
| `app/[locale]/pay/complete/page.tsx` | 결제 완료 확정 시 `clearDeviceCoupon()` 호출 |
| `components/report/ReviewCouponCard.tsx` (신규) | 열람 완료된 유료 리포트(`mode="full"`) 하단에 별점(1~5) + 한 줄 후기(200자 이내) 작성 카드 노출 및 제출 즉시 1,000원 쿠폰 발급·기기 저장 (`review_submit`, `coupon_issued` 이벤트) |
| `components/report/ReportViewClient.tsx` | 유료 전체 리포트(`initial.mode === "full"`) 하단에 `ReviewCouponCard` 연결 |
| `components/product/ProductReviewsSection.tsx` (신규) | `displayOk: true` 후기 목록 렌더링(별점 · 띠 이모지 · `"N번째 구매"` 배지). **후기가 0개면 `null`을 반환해 영역 자체를 숨김**(가짜 후기·가짜 숫자 일절 없음) |
| `app/[locale]/products/[id]/page.tsx` & `components/product/StandardProductDetail.tsx` | 상품 상세 페이지 서버에서 `getPublicReviewsForCatalog(id, 6)`를 조회해 `ProductReviewsSection`에 전달 |
| `components/GuestCheckoutModal.tsx` | 결제 모달 오픈 시 `/api/coupons/available`로 사용 가능한 1,000원 쿠폰 자동 조회·적용(`"보유 쿠폰 -1,000원 자동 적용"`, 최종 결제 금액 표시, `coupon_redeemed` 이벤트) + 모달 내 실제 구매자 후기(`ProductReviewsSection compact`) 표시. P-016-1에서 Claude가 추가한 `checkPending` 결제 완료 확인 로직은 그대로 보존 |
| `tests/routes/launchPaymentMatrix.test.ts` | 회원·비회원 1,000원 쿠폰 자동 적용 시 서버 계산 금액(`p.price - 1000`) = `Order.amount` = PortOne 검증 금액 일치 테스트, 타인 쿠폰 코드 도용 방어 테스트, 만료·사용 완료(`PAID`) 쿠폰 미적용 테스트 추가 |
| `tests/reviewsAndCoupons.test.ts` (신규) | 후기 입력 검증, 띠 배지 추출, 할인 금액 계산, 미열람 리포트(`firstViewedAt === null`) 403 차단, 열람 리포트 후기 1개+쿠폰 1장 발급 및 중복 작성 409 차단, `"N번째 구매"` 실제 누적 결제 수 계산 및 0개 시 빈 배열 반환 테스트 |

## 2. 결정론 로직 요약
- 사주·궁합 엔진(`lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts`) 및 `lib/compatPercentile.ts` 수정 없음.
- 쿠폰 할인 금액(`calculateDiscountedAmount`)은 서버에서 `catalogItem.price - 1000`으로 결정론 계산.
- 후기 작성자의 띠 배지(`deriveZodiacBadge`)는 주문에 연결된 사주 연주(`yearPillar`) 또는 출생연도(`birthYear`)에서 `lib/seo/zodiac.ts`로 계산.
- `"N번째 구매"` 배지(`purchaseCount`)는 동일 구매자(`userId` 또는 `compatId`)의 실제 `status: "PAID"` 주문 건수를 집계.

## 3. 보안 · PII · 결제 · 이벤트 변경점
- **클라이언트 금액 불신**: 클라이언트는 `couponCode`와 본인 증명용 `guestOrderTokens`만 보내고, 실제 할인 여부와 결제 금액(`Order.amount`)은 오직 서버(`app/api/payments/order/route.ts`)에서만 계산하며 `/api/payments/complete`가 PortOne 실결제 금액과 `Order.amount`를 대조.
- **비회원 쿠폰 소유권 보호**: 비회원 쿠폰의 `ownerKey`는 원문 주문번호가 아닌 SHA-256 해시(`hashGuestOrderToken`)로 저장되며, 쿠폰 코드만 추측해서는 다른 기기에서 사용할 수 없음(`candidateKeys.includes(found.ownerKey)` 필수).
- **결제 중단 시 쿠폰 증발 방지**: 쿠폰이 걸린 `PENDING` 주문이 결제 완료(`PAID`)되지 않고 중단된 경우, 같은 사용자가 재결제를 시도하면 `findUsableCoupon`이 이전 주문의 상태(`status !== "PAID"`)를 확인해 쿠폰을 새 주문에 다시 바인딩할 수 있도록 처리.
- **PII 비노출**: 공개 후기 API(`GET /api/reviews`)는 작성자 이름·이메일·생년월일 원문을 일절 반환하지 않으며, 오직 별점·후기 본문·띠 이모지·누적 구매 횟수만 반환.
- 추가된 GA4 이벤트: `review_submit`, `coupon_issued`, `coupon_redeemed`. (`compat_created` · `teaser_created` 시점 불변)

## 4. 스스로 의심 지점
- 비회원 구매자가 기기 브라우저 데이터를 완전히 삭제(`localStorage` 초기화)하면 주문 토큰(`kongdak_order_*` / `kongdak_coupon_v1`)이 사라져 비회원 쿠폰 소유권 증명이 불가능해집니다(회원 로그인 구매자는 DB `userId` 기준이라 기기 변경·캐시 삭제와 무관하게 자동 적용됨).

---

# REVIEW_HANDOFF — P-016-1 (결제 중단 복귀 안내) & P-016-3 (결제 후 이어보기 + 소식 받기 동의)

> **작성 일시**: 2026-10-24
> **범위**: `docs/uiux/decisions/P-016.md` §P-016-1 (결제 중단 복귀 안내) 및 §P-016-3 (결제 후 — 이어보기 + 소식 받기 동의)
> **검증 상태**: `tsc --noEmit` 0 errors · 변경 파일 `eslint` 0 errors · `vitest` 70파일 525개 통과(1 skip) · `npm run build` exit 0
> **DB 변경 (SQL)**: 없음 (`User.marketingConsent` · `marketingConsentAt` · `contactEmail` 및 `/api/user/marketing-consent` 기존 스키마·라우트 그대로 재사용)

## 1. 변경 파일과 이유

| 파일 | 이유 |
|---|---|
| `lib/payments/client.ts` | **[P-016-1 §1]** `requestPortOnePayment`에서 포트원 결제창 호출 직전 `sessionStorage`(`kongdak_pay_pending`)에 `{ orderId, productId, at }`를 저장하는 `rememberPendingPayment` 추가. 10분 유효기간 검사 함수 `recallPendingPayment` 및 삭제 함수 `clearPendingPayment`(PC 인라인 검증 완료 시에도 즉시 삭제) 추가 |
| `components/GuestCheckoutModal.tsx` | **[P-016-1 §2·§3]** 결제를 시작한 화면으로 돌아왔을 때(`pageshow` / `visibilitychange`, 같은 탭) 10분 이내의 `kongdak_pay_pending` 저장값이 있으면 하단 안내 시트(`"결제가 끝나지 않았나요?"`) 노출. 인앱 브라우저면 `[크롬(사파리)에서 이어서 결제하기]`(`openInExternalBrowser`, `lib/inAppBrowser.ts`) + `[다시 결제하기]`(결제 모달 재오픈) 제공. 이벤트 `pay_resume_view`, `pay_resume_external`, `pay_resume_retry` 발사 |
| `components/FortuneNewClient.tsx` | **[P-016-1 §2]** 모바일 리다이렉트 후 뒤로 가기로 전체 새로고침되어도 `GuestCheckoutModal`이 마운트되어 복귀 안내 시트가 즉시 뜨도록 입력 폼 뷰에도 모달 노드 연결 |
| `app/[locale]/pay/complete/page.tsx` | **[P-016-1 §2]** 결제 완료 화면 도착 시 `clearPendingPayment()`로 저장값 즉시 삭제. **[P-016-3 §2]** 결제 성공 화면에서 `"(선택) 새 운세 나오면 알려 드릴게요"` 체크박스(**기본 체크 안 함 `false`**) 제공 — 회원은 `/api/user/marketing-consent` 호출(이미 동의한 회원은 미노출), 비회원은 `lib/marketingConsent.ts` `rememberOptIn`에 기록해 가입·보관 시 `MarketingConsentSync`가 자동 반영 |
| `components/report/StandardReportView.tsx` | **[P-016-3 §1]** 전체 리포트(`mode="full"`)의 마지막 섹션에 `useSeenOnce`를 연결해 끝까지 읽었을 때 `onLastSectionSeen` 콜백 호출 |
| `components/report/ReportViewClient.tsx` | **[P-016-3 §1]** `StandardReportView`의 마지막 섹션이 노출된 시점(`reachedLastSection`)에 `"같은 두 사람으로 이어서 보기"` 카드(`NextReadingRecommendations`) 노출 |
| `components/CompatResultClient.tsx` | **[P-016-3 §1]** 심층 궁합(`deepReport`)의 마지막 섹션(`나와 찰떡인 이상형 사주 기운`)이 노출된 시점(`reachedDeepEnd`)에 `"같은 두 사람으로 이어서 보기"` 카드 노출 |
| `components/report/NextReadingRecommendations.tsx` | **[P-016-3 §1]** 결제 완료 리포트 하단 추천 카드(`variant="owned"`) 제목을 `"같은 두 사람으로 이어서 보기"`로 변경 (관련 단품 2개 + 세트, 이미 산 것 제외, 클릭 시 같은 생년월일로 미리보기 바로 생성) |
| `tests/payResumeAndPostPay.test.ts` (신규) | `rememberPendingPayment` · `recallPendingPayment`(10분 이내 복원 / 10분 초과 만료 삭제) · `clearPendingPayment`, 마케팅 동의 기본 미체크(`rememberOptIn` / `takeOptIn`), `getNextReadings` · `nextReadingHref` 단위 테스트 4건 |

## 2. 결정론 로직 요약
- 사주·궁합 엔진(`lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts`) 및 `lib/compatPercentile.ts` 수정 없음.
- 결제 중단 복귀 판단(`recallPendingPayment`)은 `now - at <= 10 * 60 * 1000` 조건만 검사하는 순수 시간 비교 함수.

## 3. 보안 · PII · 결제 · 이벤트 변경점
- 결제 금액·주문 생성·검증 로직(`app/api/payments/*`) 일절 변경 없음.
- `sessionStorage`의 `kongdak_pay_pending`에는 `{ orderId, productId, at }`만 저장하며 생년월일·이름 등 PII는 저장하지 않음. 결제 완료 화면 도착 시 즉시 삭제됨.
- 마케팅 수신 동의 체크박스는 **기본 체크 안 된 상태(`false`)**로 렌더링되며, 이미 동의한 회원에게는 중복 노출하지 않음.
- `compat_created` · `teaser_created` 이벤트 발사 시점 불변.
- 추가된 GA4 이벤트: `pay_resume_view`, `pay_resume_external`, `pay_resume_retry`.

## 4. 스스로 의심 지점
- iOS 인스타그램·스레드 인앱 브라우저는 `openInExternalBrowser`의 스킴 강제 이동이 OS 정책상 막혀 있어 `false`를 반환하므로, 복귀 시트 안에서 즉시 `"현재 링크 복사하기"` 폴백 안내가 펼쳐지도록 처리했습니다.

---

# REVIEW_HANDOFF — P-016-2 (무료 결과 + 대화형 입력 + 홈 세로 3:4 표지 4종)

> **작성 일시**: 2026-10-24
> **범위**: `docs/uiux/decisions/P-016.md` §P-016-2 (무료 궁합 결과 5개 항목 + 대화형 입력 4단계) 및 §P-016-5 선행 표지 4장(`public/covers/`)
> **검증 상태**: `tsc --noEmit` 0 errors · 변경 파일 `eslint` 0 errors · `vitest` 69파일 521개 통과(1 skip) · `npm run build` exit 0
> **DB 변경 (SQL)**: 없음 (P-016-2는 스키마 변경 없음)

## 1. 변경 파일과 이유

| 파일 | 이유 |
|---|---|
| `lib/compatPercentile.ts` (신규) | 점수 분포(전체 1,177쌍, 중앙값 86, 상위 30%=90, 상위 25%=91, 상위 10%=94) 기준 결정론 함수 `getCompatTopPercent` · `formatCompatTopPercentBadge` 구현. **상위 30% 이내(`score >= 90`)일 때만** `"상위 N% 궁합"` 반환 |
| `lib/compatCuriosity.ts` (신규) | 대화형 입력 4단계 `"지금 제일 궁금한 것"` 4개 선택지(`그 사람 마음` / `다시 만날 수 있을지` / `오래 갈지` / `다툼 이유`) 및 AI 말투 힌트 결합 함수 `appendCuriosityToneGuide` |
| `lib/compatFreeText.ts` | 무료 요약 마지막 문장을 중간에서 끊고 `"…그런데 그 사람은…"`으로 이어지게 자르는 `cutCompatFreeEnding` 추가 (기존 `parseCompatFreeText` 동작 불변) |
| `lib/teaserBlurCopy.ts` | 잠긴 영역 핵심 단어 서버/공통 마스킹 함수 `maskKeyWordForPreview`(`●●●`) 및 상품별 잠긴 문장 2줄 `getTeaserMaskedLines` 추가 |
| `lib/reports/teaser.ts` | `clipTeaserForView`에서 잠긴 섹션 `hooks`의 핵심 단어를 서버에서 `●●●`로 가려 클라이언트로 전달(원문 단어 브라우저 미전송) |
| `lib/reports/standardSamplePreview.ts` | `loadStandardSamplePreview`에서 잠긴 섹션 첫 문장의 핵심 단어를 서버에서 `●●●`로 마스킹한 뒤 전달 |
| `components/report/TeaserUnlockPanel.tsx` | 잠긴 부분 핵심 단어를 `●●●`로 가린 문장 2줄 노출 |
| `components/CompatResultClient.tsx` | ① `"속마음 ??? · 표현 방식 ??? · 다툼 회복 ???"` 잠긴 점수 칸 3개 카드(`nextReadingHref` 연결 + `locked_card_click` 이벤트) ② 무료 요약 마지막 문장 끊기(`cutCompatFreeEnding`) + 바로 아래 미리보기 버튼 ③ 상위 30% 이내일 때만 `"상위 N% 궁합"` 배지 표시 ④ 점수 공개 전 `"분석 끝! 눌러서 확인하기"`(콩이·닥이 하트) 클릭 시 카운트업 연출 + `score_reveal_click` 이벤트 |
| `components/CompatNewClient.tsx` | 한 화면에 질문 하나씩(`1. 나` → `2. 상대` → `3. 관계` → `4. 지금 제일 궁금한 것` 1개 선택) 대화형 4단계 입력 + 생일 칸 아래 `"생일은 암호화돼 저장돼요"` 문구 + 단계별 GA4 이벤트(`compat_step_next`, `compat_curiosity_select`). `compat_created` · `teaser_created` 발사 시점은 기존과 100% 동일하게 유지 |
| `app/api/generate-compat/route.ts` | 한국어 무료 궁합 AI 해석 생성 시 선택된 `curiosity`를 `appendCuriosityToneGuide`로 말투 가이드에만 반영(결정론 점수·키워드 무영향, `buildCompatPrompt` 시그니처·원문 불변) |
| `tests/compatPercentile.test.ts` (신규) | `getCompatTopPercent` · `formatCompatTopPercentBadge`(동일 입력=동일 출력, 경계값 89 vs 90, 중앙값 86 미노출, 91=25%, 94=10%, 단조성), `cutCompatFreeEnding`, `maskKeyWordForPreview`, `appendCuriosityToneGuide` 단위 테스트 13건 |
| `public/covers/cover_love_single.{png,webp}` 외 3종 (신규) | P-016-5 홈 포스터 슬라이드용 세로 3:4 표지 4장(`cover_love_single`, `cover_reunion`, `cover_inner_mind`, `cover_2027`) 생성 및 `.png`·`.webp` 저장 |

## 2. 결정론 로직 요약
- `lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts` 수정 없음.
- `lib/compatPercentile.ts`: 오직 `score` 숫자 하나만으로 상위 퍼센트를 계산하는 순수 결정론 함수. `score < 90`(상위 30% 밖)이면 `null`을 반환해 화면에 표시하지 않음.
- 대화형 입력 4단계의 `"지금 제일 궁금한 것"` 선택값은 `sessionStorage`를 통해 `/api/generate-compat`의 `toneGuide` 문장 톤에만 반영되며, `/api/compat`의 점수·키워드 계산에는 일절 관여하지 않음.

## 3. 보안 · PII · 결제 · 이벤트 변경점
- 잠긴 영역의 핵심 단어 마스킹(`●●●`)은 서버(`loadStandardSamplePreview`, `clipTeaserForView`)에서 수행된 후 클라이언트로 전달되어 브라우저 네트워크 응답에 원문 단어가 노출되지 않음.
- `compat_created` 및 `teaser_created` 이벤트는 기존과 동일하게 `/api/compat` 및 `/api/reports/generate` 응답 직후에 발사됨(`score_reveal_click` 클릭 여부와 무관).
- 추가된 GA4 이벤트: `locked_card_click`, `score_reveal_click`, `compat_step_next`, `compat_curiosity_select`.

---

# REVIEW_HANDOFF — 결제 전환 개편 0단계(누수 막기) + 1단계(무료=질문, 유료=답)

> **작성 일시**: 2026-10-03
> **배경**: 하루 40~50건 궁합이 만들어지는데 결제는 0~2건. 무료 결과가 이미 답을 다 줘서 궁금할 게 남지 않았고(무료 궁합 = 점수+키워드+케미 해설 전문+갈등 1개+팁), 총운·세트·프리미엄은 결제 전에 로그인을 강제했다. 사장님 결정: 가격 인하 없음, 포지셔닝은 연애·관계 유지, 무료 궁합 축소 승인, 로그인 강제 해제 승인, 간편결제(카카오페이·네이버페이·삼성페이) 표기.
> **검증 상태**: `vitest` 323 통과(40 skip) · `tsc --noEmit` 0 errors · `next build` exit 0 · 변경 파일 lint: 새 오류 0(기존 deep-report `any` 3건은 이번 변경 전부터 있음)

---

## 1. 변경 파일과 목적

### 0단계 — 누수 막기
| 파일 | 목적 |
|---|---|
| `lib/catalog.ts` | `requiresLogin: true` 8건 제거(총운 2·세트 3·프리미엄 3). 약한 hook 3개를 질문형으로(2027 신년운·건강운·2027 대운) |
| `app/api/fortune/annual/route.ts` | **비회원 전체 총운 경로 신설**: 비회원이 `orderId` 를 내면 `orderGrants` 로 권한 확인 → 전체 총운 생성 → `GeneratedReport`(cacheKey `FULL:<order.id>:annual_YYYY`, userId null)에 보관. 202(생성 중)/409(반복 실패) 처리. 미리보기 무료 본문 앞 절반만(`clipAnnualFree`). 예언형 기본 문구 4개 교체 |
| `app/[locale]/fortune/annual/AnnualFortuneClient.tsx` | 로그인 알림·이동 제거. 이 기기의 결제 토큰(총운 단품 또는 총운이 든 세트)+입력값으로 결제 후 자동으로 전체 총운 열기. 입력값이 없으면 폼 → 제출 시 전체 총운 |
| `components/FortuneNewClient.tsx` | 로그인 강제 블록 제거(세트 추천 클릭도 결제 모달로) |
| `components/premium/PremiumNewClient.tsx` | 프리미엄 로그인 강제 제거(열람은 기존 주문번호 토큰 경로 `report/new`) |
| `app/api/og/card/route.tsx` (신규) | 공유 카드 이미지: 홈 = "그 사람, 지금 나를 어떻게 생각할까?", 상품 = 상품 hook(질문). 숨김 상품은 홈 카드 |
| `lib/seo.ts` | `productShareMeta()`, `OG_CARD_URL`(v=2). 홈 제목·설명을 새 포지셔닝으로, 기본 공유 이미지를 동적 카드로 |
| `app/[locale]/products/[id]/page.tsx`, `compat/new`, `fortune/new`, `premium/[id]/new` | 상품별 og:title·og:url·og:image. 예전에는 모든 상품 링크가 홈 카드에 og:url=/ko 였다 |
| `app/[locale]/page.tsx` | 홈 `<title>`·description 새 포지셔닝 |
| `components/GuestCheckoutModal.tsx` | 카카오페이·네이버페이·삼성페이·카드 배지 + "다음 화면에서 골라요". 이니시스 카드창에 간편결제가 이미 있으나(`noeasypay` 미설정) 손님이 결제창을 열기 전엔 몰랐다 |
| `lib/useSeenOnce.ts` (신규), `TeaserUnlockPanel`, `CompatResultClient`, `lib/gtag.ts` | `view_paywall` 을 "결제 안내가 화면에 50% 이상 보인 순간 1회"로 통일. 렌더 시점·클릭·모달 열림에서 중복 발사하던 5곳 제거(모달 열림은 `checkout_open`) |

### 1단계 — 무료/유료 경계 재설계
| 파일 | 목적 |
|---|---|
| `lib/compatFreeText.ts` (신규) | 무료 궁합 형식 `[맞히는 장면]`×2 + `[아직 말하지 않은 것]`×1 파서. 예전 저장본은 첫 문단만(갈등·팁 = 답은 숨김) |
| `lib/destinyGen.ts` | 무료 궁합 프롬프트 재작성(장면 2 + 답을 가린 질문 1, 조언·결론·판정 금지, 해요체). 유료 심층 궁합에 `PROMISED ANSWERS`: cautions[0]=먼저 서운함을 삼키는 쪽 지목, 무료가 열어 둔 질문에 coreDynamic 첫 두 문장에서 답 |
| `app/api/compat/deep-report/route.ts` | 저장된 무료 해석에서 열린 질문을 꺼내 유료 프롬프트에 전달 |
| `components/CompatResultClient.tsx` | 무료 = 장면 2 + "두 사람이 아직 말하지 않은 것" 카드(답 보기 버튼). 잠금 목록을 이름이 들어간 구체적 질문 4개로("먼저 서운함을 삼키는 쪽은 ●●●" 등). 이름 비우면 당신/그 사람 |
| `lib/prompts/productSpecs.ts` | 미리보기에 `unsaid`(답을 가린 질문) 추가, hooks 2개 이상 `●●` 빈칸. 전체 리포트에 `promisedRules`(미리보기의 hooks·unsaid 에 해당 섹션에서 답하라) |
| `lib/reports/standard.ts`, `lib/reports/teaser.ts` | `StandardTeaser.unsaid?`. 검증기: unsaid 필수 + 무료 본문 되풀이 금지 |
| `app/api/reports/generate/route.ts` | FULL 생성 시 같은 사람의 TEASER 저장본을 찾아 약속(hooks·unsaid)을 프롬프트에 전달(못 찾으면 그냥 생성) |
| `components/report/StandardReportView.tsx` | "아직 모르는 것 하나" 카드 + 답 보기. 흐림 자리 문구 교체 |
| `components/FortuneNewClient.tsx` | 총운 미리보기: 서버가 만들던 영역별 hook·"●월" 티저를 이제 보여 줌(전엔 버려짐) + TeaserUnlockPanel |
| `components/product/StandardProductDetail.tsx`, `components/home/HomeExplore.tsx` | 상품 상세 h1·홈 추천 카드에서 질문(hook)을 크게, 상품 이름은 작은 라벨 |

### 테스트
- 신규 `tests/compatFreeText.test.ts`(4), `tests/routes/annualGuest.test.ts`(6: 없는 주문 403·미결제 402·다른 상품 주문 403·결제 총운 200·세트 주문 200·주문번호 없으면 미리보기+절반)
- 수정 `tests/catalog.test.ts`(로그인 강제 상품 없음), `tests/routes/paymentsOrder.test.ts`(총운 비회원 주문 200), `tests/standardReport.test.ts`(unsaid 검증)

## 2. 결정론 로직
점수·키워드 계산은 손대지 않았다(`lib/saju.ts`, `lib/trueSolarTime.ts`, `lib/compatibility.ts` 무변경). 비회원 전체 총운의 yearScore 도 AI 값을 버리고 `calculateAnnualYearScore` 로 덮는다(테스트로 확인).

## 3. 보안·PII·결제 변경점
- **권한 판정은 기존 규칙 그대로**: 비회원 총운은 표준 상품과 같은 `orderGrants`(추측 불가 orderId = 소유 증명, PAID, 상품/세트 일치, 만료). 권한 확인 전에는 AI 호출 0회(테스트).
- 비회원 전체 총운은 생년월일 원본을 저장하지 않는다(`subjectHash` 만, 테스트로 원본 미포함 확인). 입력값은 기존처럼 같은 탭 sessionStorage.
- 결제 금액·PG 호출 방식 변경 없음. 간편결제는 표기만(결제수단 파라미터 그대로 CARD).
- 시크릿 하드코딩 없음.

## 4. 스스로 의심하는 지점
1. **비회원 총운 결제 후 다른 기기·탭**: 결제 토큰과 입력값이 그 기기에만 있다. 다른 기기에선 열람 불가(표준 상품과 같은 한계). 결제 완료 화면의 "가입하고 보관" 안내에 의존.
2. **비회원이 결제 후 다른 생년월일을 입력**하면 첫 생성본(주문 단위 보관)이 계속 나온다 — 한 주문으로 여러 사람 보기 방지라 의도된 동작이지만 오타 입력 시 문의가 올 수 있다.
3. **미리보기 검증기가 unsaid 를 필수로 요구** → 모델이 빠뜨리면 재시도 비용. 실측 3건 모두 정상 생성.
4. 예전에 저장된 미리보기·무료 궁합(구형식)은 새 카드 없이 보인다(무료 궁합은 갈등·팁을 숨김 처리).
5. 실제 PG 결제(이니시스 PC 팝업)는 자동화 브라우저가 팝업을 막아 끝까지 확인하지 못했다. 비회원 총운 결제→열람은 route 테스트로만 검증.
6. `FortuneNewClient` 가 `lib/prompts/productSpecs`(프롬프트 원문)를 클라이언트로 가져온다 — 이번 변경 전부터. 프롬프트 노출 우려로 별도 정리 권장.
7. 테스트 중 운영 DB에 PENDING 주문 1건(4,900원, test@example.com)과 테스트 궁합·미리보기 몇 건이 생겼다(로컬 dev 가 운영 DB 사용).

## 5. 측정
`view_paywall`(보임) → `click_unlock_teaser`/`click_unsaid`/`click_unlock_single` → `checkout_open` → `checkout_submit` → `begin_checkout` → `purchase_confirmed`. 로컬에서 `view_paywall → click_unlock_teaser → checkout_open` 순서·1회 발사 확인. 배포 후 1주 이전/이후 비교(트래픽이 작아 A/B 불가).

---

# 추가(2026-10-03 오후) — 결제한 비회원이 다시 들어오는 길

> **계기**: 사장님이 비회원으로 2026 총운을 결제·열람·환불. 12:48 전체 열람 → 12:49 상품 화면으로 재진입(`/fortune/new?productId=annual_2026`) → 미리보기와 결제 안내만 나옴(접속 기록으로 확인). 총운 전체 화면에 링크 복사·가입 저장도 없었음.
> **검증**: `vitest` 337 통과 · `tsc` 0 errors · `next build` exit 0 · 로컬 프로덕션 빌드에서 화면 흐름 확인(결제는 불가해 서버 응답만 대체) + 환불·만료 경로는 실제 서버 응답으로 확인

## 원인(전 상품 공통)
1. 상품·입력 화면이 이 기기의 결제 증명(localStorage `kongdak_order_*`)을 보지 않았다 → 재진입 시 미리보기·결제 안내.
2. 총운 전체 화면에 보관 안내 없음, 일반·프리미엄 리포트 화면에 가입 저장 없음. 결제를 계정에 묶는 버튼은 대시보드·궁합 화면에만.
3. 이미 만든 리포트도 입력값(sessionStorage)이 없으면 생년월일을 다시 요구.
4. 환불·만료 뒤 기기에 남은 결제 증명이 정리되지 않아 오류 화면.

## 변경
| 파일 | 내용 |
|---|---|
| `lib/payments/deviceOrders.ts` (신규) | 기기의 결제 내역 읽기(`parseOrderTokenKey`·`ownedOrdersFor`·`deviceOrderHref`), 서버 확인 후 무효 토큰 정리(`listValidDeviceOrders`·`forgetDeviceOrder`) |
| `app/api/payments/owned/route.ts` (신규) | 제시한 orderId 중 지금 유효한 것(PAID + 만료 전 권한)만 반환. 30개 제한. 모르는 주문 정보는 안 나감 |
| `components/OwnedReportNotice.tsx` (신규) | "이미 결제한 리포트예요 → 다시 보기". 상품 상세(표준·프리미엄), 운세·궁합 입력 화면, 홈(비회원), `/me`(비회원)에 배치 |
| `components/GuestKeepBanner.tsx` (신규) | 비회원: 링크 복사 + 가입하고 저장 / 로그인 + 묶을 결제 있음: [이 계정에 저장하기](누를 때만, M-8 유지). 총운·일반·프리미엄 리포트 화면에 배치 |
| `app/api/fortune/annual/route.ts` | 비회원: 권한 확인을 입력 검증 앞으로, 저장본이 있으면 생년월일 없이 반환(`NEED_INPUT`·`NOT_PAID`·`NO_ACCESS` code). 회원: 비회원 때 결제해 계정에 연동한 주문의 저장본을 프로필 없이도 그대로 반환. `firstViewedAt` 기록 |
| `app/api/reports/generate/route.ts` | FULL: 주문 권한 확인 직후 저장본(`FULL:<order.id>:<catalogId>`)이 READY 면 입력 없이 반환 |
| `AnnualFortuneClient.tsx` | 결제 증명만으로 자동 열기, 환불·만료면 증명 정리 후 안내, 결제 확인 안내, 보관 배너, 결제한 총운에선 "다른 생년월일로 다시 보기" 숨김, 한자 표기(丙午年) 제거 |
| `components/report/ReportNewClient.tsx` | 입력값이 없어도 먼저 시도(저장본 열기), 400 이면 입력 폼, 402·403 이면 증명 정리 + 안내 |
| `pay/complete`, `CompatResultClient`, `MeClient` | "링크만 있으면 다른 기기에서도 볼 수 있다"는 식의 틀린 안내 수정(링크는 같은 브라우저에서만, 다른 기기는 가입 저장). "평생·영구" 표현 제거(열람 90일/365일) |

## 보안·PII
- 열람 판정은 그대로 서버(`orderGrants`). 새 API 는 **제시한** orderId 의 유효 여부만 답한다.
- 입력 없이 저장본을 주는 경로도 주문 권한 확인 뒤에만 탄다(테스트: 없는 주문 403, 환불 402, AI 호출 0).
- 계정 연동은 여전히 httpOnly `kd_claim` 쿠키 + 사용자 클릭.

## 의심 지점
1. 실제 결제 → 재진입 → 저장본 열기를 운영에서 끝까지 해 보지 못했다(유효한 테스트 주문이 없음). 서버는 route 테스트, 화면은 응답 대체로 확인.
2. `kd_claim` 쿠키는 가장 최근 결제 1건만 가리킨다 → 비회원이 여러 건 결제 후 가입하면 최근 1건만 [이 계정에 저장하기]로 묶인다(나머지는 그 기기에서만).
3. 궁합 상품은 같은 두 사람이라도 궁합을 새로 만들면 다른 궁합 id 가 된다 → "이미 결제한 리포트" 안내로만 이어진다(입력을 새로 하면 새 미리보기).

---

# 추가(2026-10-03 밤) — 결제 모달 간소화

> **근거(GA4 7일)**: 결제 안내를 본 80명 → 결제 모달 24명(30%) → 결제창(PG) 8명(33%) → 결제 7명. 10/2~10/3 은 모달을 연 15명 중 결제하기를 누른 사람이 4명(사장님 테스트 2건 포함). 가장 큰 구멍이 모달이었다.
> **사장님 승인**: 모바일 이메일 필수 해제, 동의 체크박스 → 버튼 아래 고지.
> **검증**: `vitest` 341 통과 · `tsc` 0 · `next build` exit 0 · 로컬(테스트 채널, 모바일 화면)에서 입력 칸 0개 → 결제하기 → 이니시스 모바일 결제창(카카오페이·네이버페이 노출) 도달 확인

| 파일 | 내용 |
|---|---|
| `components/GuestCheckoutModal.tsx` | 모바일: 입력 칸 없음(이름은 앞에서 넣은 값 또는 "콩닥 고객"), 하단 시트 + 스크롤, 체크박스 대신 고지 문구, `checkout_close {reason, seconds, typed, inapp}` 측정. PC: 이니시스 필수값 3칸 유지 |
| `app/api/payments/order/route.ts`, `lib/payments/client.ts` | 비회원 이메일 선택(보내면 형식 검사). PG 호출에 빈 이메일을 넣지 않음 |
| `app/api/payments/contact/route.ts` (신규) | 결제 후 이메일 남기기: orderId 소지자만, 이메일이 없는 주문에 1회만 기록, 응답·로그에 이메일 없음 |
| `app/api/payments/complete/route.ts`, `pay/complete/page.tsx` | `needsEmail` → 결제 완료 화면에 "영수증·문의용 이메일(선택)" |
| `messages/ko.json` | 약관 제9조 8항: "필수 동의 항목으로 고지" → "결제 버튼과 함께 고지하며 결제를 진행하면 동의", 개정일 추가 |
| `docs/ops/nginx-000-default-deny.conf` | 서버에 적용한 nginx 기본 차단 블록 사본(모르는 Host 는 444 / TLS 거절). aba-love.com 이 이 서버 IP 를 가리키던 문제 |

## 의심 지점
1. 이메일 없는 비회원 주문은 문의 시 주문번호나 결제 시각으로 찾아야 한다(결제 완료 화면에서 이메일을 남기지 않은 경우).
2. PC 흐름(팝업)은 결제 완료 화면을 거치지 않는다 — PC 는 이메일을 모달에서 받으므로 영향 없음.
3. 체크박스 없는 고지 방식의 법적 판단은 사장님 결정 사항(약관 문구는 맞춰 둠).
4. 모달 이탈 원인은 `checkout_close` 가 며칠 쌓여야 숫자로 확인된다.

---

# 추가(2026-10-04) — 구매자 오류 수정, 측정 정리, 가입 유도

> **근거**: 10/4 11:19 회원이 "이 사람 세트" 12,900원 결제(가입 3분 뒤). 9/29 이후 결제 4건 모두 가입 후 1~5분 안의 회원. 이틀 유입은 인스타 유료 광고 78 · 스레드 27(전부 홈 `/ko` 착지). 무료 한도 도달 9명.
> **검증**: `vitest` 348 통과 · `tsc` 0 · `next build` exit 0 · 로컬 빌드에서 한도 화면·로그인 복귀 주소·GA 차단 확인 · 운영 배포 VERIFIED(c8afde0, 68d72b8, a5303ba)

| 구분 | 파일 | 내용 |
|---|---|---|
| 버그 | `app/api/reports/mine/route.ts`, `components/MeClient.tsx`, `components/report/ReportNewClient.tsx`, `app/api/reports/generate/route.ts` | 보관함의 정통 궁합이 [리포트 만들기]로 떠서 500(`missing spec for compat_basic`) — 구매자가 6번 겪음. `COMPAT_ROUTE` 로 궁합 결과 화면에 연결, 생성 API 는 400 안내 |
| 버그 | `app/[locale]/login/page.tsx` | `?callbackUrl=` 을 무시하고 항상 대시보드로 보내던 문제. 같은 사이트 경로(`/`로 시작, `//`·역슬래시 불가)만 허용해 복귀 |
| 화면 | `app/[locale]/pay/complete/page.tsx` | 회원에게는 "가입하고 보관" 대신 "내 보관함", 비회원 보관 안내는 비회원에게만 |
| 측정 | `lib/payments/client.ts`, `pay/complete`, `app/api/payments/complete/route.ts` | 모바일 결제도 GA4 `purchase` 전송. `transaction_id` 는 주문번호(열람 증명) 대신 영수증 id(`order.id`) |
| 측정 | `components/Analytics.tsx` | localhost·`/admin` 은 `ga-disable` 로 전송 차단 |
| 측정 | `lib/inAppBrowser.ts`, `prisma/schema.prisma`(Order.clientEnv, nullable 추가), `app/api/payments/order/route.ts`, `GuestCheckoutModal` | 접속 환경 라벨(`threads:m` 등)을 결제 이벤트와 주문에 기록. 스레드 UA("Barcelona") 인식 |
| 전환 | `lib/previewLimit.ts`, `app/api/reports/generate/route.ts`, `PreviewLimitPanel`, `FortuneNewClient`, `CompatNewClient` | 무료 미리보기: 비회원 3 · 회원 6. 한도에 닿은 비회원에게 "가입하면 N개 더" → 가입 후 같은 상품 미리보기로 복귀(운세 `auto=1`, 궁합 `from=`) |
| 외부 설정 | GA4(Google 태그) | 원치 않는 추천: accounts.google.com, kauth.kakao.com, accounts.kakao.com, nid.naver.com, inicis.com |

## 의심 지점
1. 가입 유도의 효과는 미확인 — "가입자가 결제한다"는 상관이지 인과가 아니다. `preview_limit_view{signup_offer}` → `preview_limit_signup_click` → 가입 → 결제로 확인.
2. 한도는 기기(쿠키) 기준. 인앱에서 외부 브라우저로 넘어가 가입하면 쿠키·입력값이 따라오지 않는다.
3. `clientEnv` 는 클라이언트가 보낸 값(형식만 검사). 판정에는 쓰지 않고 분석용.
4. 청약철회 고지는 체크박스 없이 버튼 아래 고지 유지(사장님 결정 10/4).
5. 메타 픽셀은 보류(광고를 소액·7일만 운영 예정).

---

# 추가(2026-10-05) — 결제 실패 복귀, 로그인 중복 콜백, 카카오페이 바로가기

> **근거(10/4~10/5)**: 모달을 연 14명 중 11명이 닫음(입력 칸을 없앤 뒤에도 비율 그대로). 비회원 결제창 이탈 2건 — 잔액부족(가입 후 재결제 성공), 스레드 인앱에서 이니시스 결제창 미복귀. 가입 유도 흐름은 운영에서 1회 끝까지 동작 확인.
> **검증**: `vitest` 348 · `tsc` 0 · build exit 0 · 배포 VERIFIED(d9df37a, 56d4ed5). 카카오페이 바로가기는 로컬 테스트 채널과 **운영 채널** 모두에서 카카오페이 결제 화면으로 직행 확인(결제는 하지 않음)

| 파일 | 내용 |
|---|---|
| `components/GuestCheckoutModal.tsx`, `lib/payments/client.ts` | 모바일: [카카오페이로 결제](EASY_PAY + easyPayProvider KAKAOPAY) + [카드·네이버페이·삼성페이로 결제](기존 창). `method` 를 checkout_submit·begin_checkout·payment_failed 에 기록. 닫은 이유는 이벤트 이름으로도(`checkout_close_x/cancel/backdrop/fast`) |
| `lib/payments/client.ts`, `app/[locale]/pay/complete/page.tsx` | 결제 실패·취소 복귀 화면에 [다시 결제하러 가기](결제를 시작한 화면, 미리보기 자동 복원 `auto`·`from`) |
| `app/[locale]/login/page.tsx` | 이미 로그인된 상태면 callbackUrl 로 즉시 이동, 같은 사이트의 절대 callbackUrl 허용, 로그인 화면으로의 복귀 금지 |

## 의심 지점
1. PC 는 카카오페이 바로가기가 없다(이니시스 PC 필수값·팝업 방식이라 확인 불가).
2. 네이버페이·삼성페이 직접 호출은 넣지 않았다(같은 방식으로 가능, 수요를 보고 결정).
3. 테스트로 운영 DB 에 PENDING 주문 몇 건(재물운 4,900원, 비회원)이 생겼다.

---

# 추가(2026-10-05) — 검색용 페이지(띠 궁합 78쌍 · 출생연도별 2027 운세 48개)

> **근거**: 유입이 유료 인스타·스레드뿐이고 검색 유입이 사실상 0(이틀간 구글 수집 13회·네이버 5회, 사이트맵 31개 주소). 광고비 없이 유입을 늘릴 길은 검색뿐이라, "쥐띠 소띠 궁합"·"95년생 2027년 운세" 같은 긴 검색어를 받을 페이지를 만들었다.
> **검증**: `vitest` 362 통과(신규 14) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 상세·모아보기·뒤집힌 주소 308·없는 주소 404·사이트맵 159개·공유 카드·`seo_cta_click` 발사 확인.

| 파일 | 내용 |
|---|---|
| `lib/seo/zodiac.ts` | 결정론. 띠 관계는 `lib/compatibility.ts` 의 표를 **읽기만** 한다(엔진 수정 없음). 관계 유형별 고정 점수(단짝 92 · 한 팀 88 · 닮은꼴 78 · 무난 74 · 서운 62 · 날 선 56 · 정반대 50), 쌍 주소 정본화, 출생연도 → 띠·색·2027년 나이·그 해와의 관계·삼재 단계 |
| `lib/seo/content.ts`, `scripts/seo/generateContent.ts` | 본문 형식·검사기와 생성 스크립트. AI 는 위 사실을 받아 **문장만** 쓴다. 한자·전문용어·단정적 예언이 섞이면 버리고 다시 생성. 결과는 `data/seo/*.json` 에 저장(런타임 AI 호출 없음) |
| `data/seo/zodiac-pairs.json`, `data/seo/fortune-2027.json` | 저장된 본문 78 + 48 |
| `app/[locale]/zodiac/*`, `app/[locale]/fortune/2027/*` | 모아보기 2개 + 상세 2종. 제목·설명·canonical·공유 카드·FAQ/경로 구조화 데이터. 뒤집힌 쌍 주소(ox-rat)는 정본(rat-ox)으로 308 |
| `components/seo/*` | 본문 조각(서버) + CTA 버튼(클라이언트, `seo_cta_click {page, target}`) |
| `app/api/og/card/route.tsx` | `?z=<띠 쌍>`, `?y=<출생연도>` 카드. 자유 문장은 받지 않는다 |
| `app/sitemap.ts`, `components/Footer.tsx` | 사이트맵 31 → 159개. 모든 화면 하단에 [띠 궁합] [2027년 운세] 링크 |
| `tests/seoZodiac.test.ts`, `tests/seoContent.test.ts` | 결정론(순서 무관·경계 연도) + 저장된 글 전체가 규칙을 지키는지 |

## 결정론 요약
- 띠 궁합 점수 = 두 띠의 관계 유형 하나로 정해지는 고정값(같은 입력 = 같은 점수). 화면에 "띠 기준 궁합"이라고 밝히고, 실제 궁합(생년월일)은 다를 수 있다고 안내해 무료 궁합으로 보낸다.
- 출생연도 페이지는 점수를 보여 주지 않는다. 띠·나이·그 해와의 관계 문구만 계산값이다.

## 보안/PII/결제
- 개인정보를 받지 않는 공개 페이지다. 결제·DB 변경 없음. 생성 스크립트는 `.env` 의 기존 키를 읽기만 한다(커밋 없음).

## 의심 지점
1. **본문은 AI 가 쓴 글이다.** 형식·금칙어는 전수 검사했지만 내용의 질은 표본만 읽었다. "삼재"는 해당 띠(돼지·토끼·양)의 글에서만 쓴다(흔히 쓰는 말이라 허용, 겁주지 않는 문장으로).
2. 띠만으로 본 점수가 실제 궁합 점수와 다르게 나올 수 있다(예: 띠 50점인데 실제 80점). 화면에서 "큰 틀"이라고 밝혔다.
3. 띠는 입춘에 바뀌므로 1~2월 초 출생은 앞 해 띠일 수 있다 — 출생연도 페이지 하단에 고지.
4. 검색 노출은 수 주가 걸리고 보장되지 않는다. 126개가 한꺼번에 생겨 "얇은 글"로 보일 위험을 줄이려고 쌍·나이대마다 내용을 다르게 썼다.
5. 2028년이 되면 `FORTUNE_TARGET_YEAR` 와 폴더 이름(2027)을 새로 만들어야 한다(지금은 고정).

## 검색엔진 등록(2026-10-05, 배포 addc2c9 · 6c5fd34 VERIFIED)
- **구글 서치 콘솔**(도메인 속성 kongdak.kr): 사이트맵 재제출(이전에는 6개 주소만 읽힌 상태) + 색인 생성 요청 8건(홈, 궁합 입력, 모아보기 2개, 상세 4개).
- **네이버·빙**: `scripts/seo/indexnow.ts` 로 사이트맵의 159개 주소 통보(네이버 200, 빙 202). 열쇠 파일은 `public/<열쇠>.txt` — 규약상 공개하는 값이라 비밀이 아니다.
- 새 페이지를 만들거나 크게 고치면 배포 후 `npx tsx scripts/seo/indexnow.ts` 를 다시 실행한다.
- 미완: 네이버 서치어드바이저 화면(사이트맵 제출 확인)은 자동화 브라우저에서 접근이 막혀 직접 확인하지 못했다.

---

# 추가(2026-10-05) — 제휴 배너 전용 주소, 이어보기 카드, 선택 수신 동의

> **근거**: (1) 커플다이어리 앱(플레이스토어 10만+)에 배너를 무료로 싣기로 함 — 효과를 숫자로 봐야 협업 여부를 정할 수 있다. (2) 회원 22명 중 구매 6명 전원이 가입 후 10분 안에 결제, 나중에 돌아와 산 사람 0명. 미구매 15명에게는 수신 동의가 없어 홍보 연락을 할 수 없다.
> **검증**: `vitest` 379 통과(신규 17) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 가입(선택 동의 체크) → 동의 저장·`marketing_optin` → 보관함 스위치로 철회·`marketing_optout` → 미리보기 생성 → 홈·보관함 이어보기 카드·`resume_card_view/click` → 전용 주소 302·쿠키·클릭 집계 → 관리자 집계 화면까지 확인. 테스트 계정과 테스트 클릭은 삭제했다.

| 파일 | 내용 |
|---|---|
| `lib/campaignLinks.ts`, `app/[locale]/go/[code]/route.ts` | `/ko/go/cd1~cd4` → 클릭을 하루 단위로 세고(봇 제외, `SiteCounter` 키 `go:<코드>:<한국 날짜>`) utm 을 붙여 `/ko/compat/new` 로 보낸다. 유입 표시 쿠키 `kd_src`(httpOnly, 30일) |
| `app/api/payments/order/route.ts`, `prisma/schema.prisma` | `Order.campaign`(추가 칸) — 쿠키의 유입 표시를 정해진 형식일 때만 저장. 금액·권한 판정에는 쓰지 않는다 |
| `app/[locale]/admin/campaigns/page.tsx`, `admin/layout.tsx` | 관리자 > 배너 유입: 배너별 오늘·7일·누적 클릭, 결제 시작·완료·금액, 날짜별 클릭 |
| `lib/member/resume.ts`, `app/api/user/resume/route.ts`, `components/member/ResumeCard.tsx` | 미리보기만 보고 결제하지 않은 것(최근 2개)을 회원 홈·보관함에 "이어보기"로. 이미 산 것·그 상품이 든 세트를 산 것·숨긴 상품·60일 지난 것은 제외 |
| `app/api/reports/generate/route.ts` | 비회원 때 만든 미리보기를 가입 후 다시 보면 그 행에 회원을 이어 둔다(주인 없는 행만) |
| `lib/marketingConsent.ts`, `components/MarketingConsentSync.tsx`, `app/api/user/marketing-consent/route.ts`, `components/member/MarketingConsentToggle.tsx`, 로그인 화면 | (선택) 혜택·새 소식 받기 — 기본은 체크 안 됨. 체크하고 1시간 안에 로그인하면 계정에 저장. 보관함 스위치로 언제든 철회. `User.marketingConsent`, `marketingConsentAt`(추가 칸) |
| `messages/ko.json`, `app/[locale]/privacy/page.tsx` | 개인정보 처리방침에 선택 수집 항목·목적·보유 기간, 유입 구분 쿠키 고지 추가(10/5 개정) |

## 보안/PII/결제
- 전용 주소는 IP·기기 정보를 저장하지 않는다(숫자만 올린다). 유입 표시는 `출처:배너` 형식의 짧은 글자뿐.
- 결제 금액·열람 권한 로직은 건드리지 않았다. DB 는 칸 3개 추가만(기존 데이터 변경 없음).
- 수신 동의는 기록만 한다. 실제 발송 기능은 없다 — 보낼 때는 제목에 (광고) 표기와 수신 거부 방법을 넣어야 한다.

## 의심 지점
1. 앱이 배너를 앱 안 화면(웹뷰)으로 열면 결제창(이니시스·카카오페이 앱 전환)이 막힐 수 있다. 실제 기기에서 한 번 눌러 봐야 안다.
2. 클릭 수는 사람이 같은 배너를 여러 번 누르면 그만큼 올라간다(순방문자 수가 아니다). 순방문은 GA4 로 본다.
3. 결제 귀속은 같은 기기·같은 브라우저 30일 기준이다. 앱 안 화면에서 보고 나중에 다른 브라우저로 결제하면 잡히지 않는다.
4. 이어보기는 저장된 내 정보가 없는 회원이면 입력 화면이 그 상품으로 열린다(같은 탭에 방금 넣은 값이 있으면 바로 미리보기).
5. 소셜 로그인 사용자는 체크 칸을 지나치기 쉽다 — 동의율이 낮으면 결제 완료 화면 등 다른 자리를 검토.

## 배너 유입 — 가입·매출 집계 추가(2026-10-06)
> **검증**: `vitest` 388 통과(신규 9) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬에서 전용 주소 클릭 → 가입 → 관리자 화면에 가입 1건 표시 확인(테스트 계정·테스트 클릭 삭제).

| 파일 | 내용 |
|---|---|
| `prisma/schema.prisma` | `User.campaign`(추가 칸) — 배너를 누른 뒤 가입한 회원의 유입 표시 |
| `app/[locale]/go/[code]/route.ts`, `lib/campaignLinks.ts` | 누른 시각 쿠키 `kd_src_t` 추가. `isSignupAfterClick`: 누른 **뒤에** 만든 계정만 가입으로 인정(원래 회원이 배너를 누른 것은 제외) |
| `app/api/user/attribution/route.ts`, `components/CampaignSignupSync.tsx` | 로그인 직후 한 번, 서버가 쿠키를 읽어 계정에 표시를 남긴다(요청 본문은 받지 않음, 이미 표시가 있으면 그대로). GA4 `signup_from_campaign` |
| `lib/campaignStats.ts`, `app/[locale]/admin/campaigns/page.tsx` | 오늘·7일·누적 요약(매출·클릭·가입·결제), 배너별 클릭→가입→결제→매출과 전환율, 날짜별 표. 매출 = 결제 완료(PAID) 합계 — 환불·취소 제외. 배너로 가입한 회원이 다른 기기에서 결제한 주문도 포함 |

**의심 지점**: 가입 귀속은 배너를 누른 그 브라우저에서 가입해야 잡힌다(앱 안 화면에서 누르고 다른 브라우저에서 가입하면 빠진다). 비회원 결제는 가입 수에는 없고 매출에는 들어간다.

---

# 추가(2026-10-06) — 수신 동의 물어보기 카드, 앱 설치 집계, 관리자 "회원·설치"

> **근거**: 회원 25명 중 수신 동의 0명(로그인 화면 체크 칸 도입 후 가입 3명 모두 미체크), 이메일은 12명뿐(카카오 8명 중 0명, 네이버 7명 중 2명). 앱 설치는 기록 장치가 없어 서버 기록으로 "하루 3~4회 실행"만 보였다.
> **검증**: `vitest` 394 통과(신규 6) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬에서 가입 → 홈 카드 표시 → (이메일 없는 회원) 빈 값 오류 → 이메일 입력·동의 저장 → 잘못된 이메일 400 → 설치·실행 집계 → 관리자 화면 표시 확인. 테스트 계정·집계 삭제.

| 파일 | 내용 |
|---|---|
| `components/member/MarketingConsentCard.tsx`, `components/DashboardView.tsx` | 회원 홈에서 한 번 묻는다(아직 정하지 않은 회원만). 받을게요/괜찮아요 중 하나를 고르면 다시 묻지 않는다. 결제 흐름 화면에는 띄우지 않는다 |
| `app/api/user/marketing-consent/route.ts`, `prisma/schema.prisma` | GET 에 `decided`·`hasEmail` 추가. 계정에 이메일이 없는 회원은 동의할 때 소식 받을 이메일을 함께 받는다 → `User.contactEmail`(추가 칸). **로그인용 `email` 에는 쓰지 않는다**(확인되지 않은 주소로 계정이 엮이는 것 방지) |
| `components/PwaTracker.tsx`, `app/api/pwa/event/route.ts`, `lib/pwaStats.ts` | 설치(appinstalled)·설치된 앱 실행(탭 세션당 1회)·처음 연 기기를 하루 단위 숫자로 센다(`SiteCounter` 키 `pwa:<종류>:<한국 날짜>`). 로그인 회원이면 `User.pwaInstalledAt`(추가 칸) |
| `components/InstallPWAButton.tsx` | GA4: `pwa_banner_view`·`pwa_install_click`·`pwa_install_choice`·`pwa_banner_dismiss` |
| `lib/audienceStats.ts`, `app/[locale]/admin/audience/page.tsx`, `admin/layout.tsx` | 관리자 > 회원·설치: 보낼 수 있는 회원(동의+이메일)·가입 경로별 표, 설치한 기기·앱 실행·알림 구독·날짜별 표 |
| `app/robots.ts` | `/api/pwa` 수집 차단 |

## 보안/PII
- `contactEmail` 은 PII — 로그·화면에 내지 않는다(관리자 화면은 개수만). 형식만 검사하고 본인 확인 메일은 보내지 않는다(발송 기능이 아직 없다).
- 설치 집계는 숫자만 올린다. 부풀리기 방지로 같은 IP 는 하루 30회까지(메모리에서만 세고 저장하지 않음).

## 의심 지점
1. 기존 회원 25명 전원에게 다음 방문 때 카드가 한 번 뜬다(사이트 안 안내라 동의 없이 가능).
2. `contactEmail` 은 확인되지 않은 주소다 — 실제 발송 전에 수신 확인 절차를 넣을지 정해야 한다.
3. "설치한 기기"는 기기 저장소 기준이라 앱 데이터를 지우면 다시 세어진다. 집계 시작(10/6) 전에 설치한 기기는 다음 실행 때 잡힌다.
4. 카카오 이메일 동의 항목은 카카오 개발자 콘솔 설정이 필요하다(미완, 사장님 계정).

---

# 추가(2026-10-07) — 메타 픽셀(광고 성과 측정)

> **근거**: 인스타그램 광고가 끝난 10/6 부터 유입이 1/3 로 줄었고(하루 약 69명 → 25명), 지난 광고는 239회 방문에 GA4 기준 결제 1건이었다. 광고를 다시 하기 전에 메타가 "결과를 보고 결제까지 가는 사람"을 학습할 수 있게 사이트 안의 행동을 알린다.
> **검증**: `vitest` 403 통과(신규 9) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 상품 화면 PageView·ViewContent 기록, 결제 복귀 주소의 paymentId 가 가려진 채 기록되는 것 확인(로컬은 기록만, 전송 없음).

| 파일 | 내용 |
|---|---|
| `lib/metaPixel.ts` | 측정 이벤트 → 메타 표준 이벤트(view_item→ViewContent, compat_created·teaser_created→Lead, checkout_open→InitiateCheckout, begin_checkout→AddPaymentInfo, purchase→Purchase+금액+eventID). 주소의 paymentId·orderId·token 등을 보내는 순간에만 가린다(History 원본 함수 사용 — Next 라우터가 모르게) |
| `components/MetaPixel.tsx`, `components/Providers.tsx` | 픽셀 불러오기(운영만), 화면이 바뀔 때 PageView. `autoConfig` 끔(버튼·페이지 정보 자동 수집 안 함), 자동 고급 매칭 미사용. localhost 는 `window.__fbqLog` 에 기록만, 관리자 화면 제외 |
| `lib/gtag.ts` | `trackEvent` 가 메타에도 알린다(GA 가 막혀 있어도) |
| `next.config.ts` | CSP 에 `connect.facebook.net`(script·connect), `www.facebook.com`(img·connect) 허용 |
| `messages/ko.json`, `app/[locale]/privacy/page.tsx` | 개인정보 처리방침 5항에 행태정보 처리·국외 이전(Meta, 미국)·거부 방법 고지(10/7 개정) |

## 보안/PII
- 메타로 가는 값: 화면 주소(민감한 쿼리 제거), 상품 id, 금액, 영수증 번호(중복 제거용 eventID). **생년월일·이름·이메일·궁합 id 는 보내지 않는다**(테스트로 고정).
- 픽셀 ID(2390478744821136)는 공개 값이라 코드 기본값으로 두었다(`NEXT_PUBLIC_META_PIXEL_ID` 로 바꿀 수 있음). 전환 API 토큰은 아직 쓰지 않는다 — 쓸 때는 서버 환경변수로만.

## 의심 지점
1. 궁합 결과 주소(`/ko/compat/<공유 토큰>`)는 PageView 로 메타에 전달된다(공유용 공개 주소라 가리지 않았다).
2. 결제 건수가 적어 "구매" 최적화는 학습이 안 된다 → 처음에는 Lead(결과 봄)나 InitiateCheckout 을 목표로 잡을 것.
3. 서버 전송(전환 API)은 미적용 — 광고 차단·iOS 제한으로 일부 누락이 있을 수 있다.
4. 맞춤형 광고 고지는 방침에 넣었지만 쿠키 동의 배너는 없다(국내 서비스 기준).

## 광고 소재별 전용 주소(2026-10-07, 배포 87938ac VERIFIED)
- `lib/campaignLinks.ts`: 인스타 영상 광고 6개(`ig-b1~3` 속마음 입력 화면, `ig-a1~3` 무료 궁합 입력 화면). `CampaignLink.query` 추가.
- `/ko/go/<코드>` 가 광고 플랫폼의 클릭 표시(`fbclid`·`gclid`·`ttclid` 등 정해진 6종, 형식 검사)를 도착 주소로 넘긴다 — 이전에는 버려져서 픽셀이 광고 클릭을 알아볼 수 없었다. 그 밖의 쿼리는 넘기지 않는다.
- 관리자 화면 이름을 "광고·배너 유입"으로 변경. `vitest` 404 통과.
- 영상 제작 자료는 `SNS/광고영상_2026-10/`(커밋하지 않음): 장면별 프롬프트 가이드, 참조 이미지, 실제 화면 녹화, 마지막 화면·표정 컷.

---

# 추가(2026-10-08) — 검색 기술 점검(claude-seo 기술 점검 기준)과 수정

> **근거**: 운영 사이트를 항목별로 점검(수집·색인·보안·주소·모바일·구조화 데이터·렌더링·IndexNow). 서버 렌더링, HTTPS·보안 헤더, 404 상태 코드, robots, IndexNow 는 정상. 아래는 고친 것.
> **검증**: `vitest` 404 통과 · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 이동(308)·canonical·robots·상품 구조화 데이터·사이트맵 확인.

| 문제 | 수정 |
|---|---|
| canonical 을 선언하지 않은 화면이 레이아웃의 canonical(홈)을 물려받음 — `/fortune/annual`(색인 대상인데 홈의 중복으로 표시), `/pay/complete` 등 | `buildPageMetadata(..., { inherited: true })` — 레이아웃은 canonical 을 물려주지 않는다. 홈은 `app/[locale]/page.tsx` 가 직접 선언 |
| `/pay/complete`·`/onboarding`·`/fortune/weekly` 가 색인 허용 | `NOINDEX_PATHS` 에 추가 + 얇은 레이아웃 |
| 사이트맵에 리다이렉트되는 `/pricing`, 매 요청마다 "지금"으로 찍히는 lastmod, `/fortune/new`·`/fortune/annual` 누락 | `/pricing` 제거, 고정 날짜(`SITE_UPDATED`·`SEO_PAGES_UPDATED`), 두 주소 추가(159 → 160) |
| `www.kongdak.kr` 가 그대로 200(주소 이원화), 루트 `/` → `/ko` 가 임시 이동(307) | `middleware.ts` 에서 둘 다 308 |
| 상품 상세 제목 14자·설명 19자, 상품 구조화 데이터 없음 | `productSearchMeta`(이름 — 설명 | 콩닥 / 질문 + 무료 미리보기 + 가격), `ProductJsonLd`(Product + Offer + BreadcrumbList) |
| 입력 화면 제목이 "상대방 정보 입력"·"내 사주 정보 입력" | `PAGE_META` 의 검색용 제목·설명 사용 |
| `/fortune/annual` 설명의 "병오년" | "붉은 말의 해"로 |

## 의심 지점
1. 루트 `/` 의 308 은 브라우저가 오래 기억한다. 다른 로케일을 다시 깨울 때는 이 이동부터 손봐야 한다.
2. 핵심 웹 지표(LCP 등)는 이번에 측정하지 못했다 — PageSpeed 공개 API 가 하루 한도 초과.
3. 동면 로케일(`/en/...`)은 여전히 200 으로 한국어 화면을 내고 canonical 로만 합친다(삭제 금지 규칙에 따라 유지).

---

# 추가(2026-10-08) — 검색용 페이지 응답 시간(Cloudflare 보관 준비)

> **근거(실측)**: 네이버 수집 현황에서 페이지당 약 1초. 서버가 페이지를 만드는 시간은 0.03~0.07초(서버 안에서 직접 호출), 한국에서 Cloudflare 를 거치면 첫 바이트 0.55~1.1초. 차이는 전부 Cloudflare 중계 서버 ↔ 프랑스 원본 왕복이다. nginx 는 이미 keepalive 620초·TLS 1.3·gzip 이라 서버 쪽에서 더 줄일 것이 거의 없다.
> **검증**: `vitest` 408 통과(신규 `tests/edgeCache.test.ts` 4건) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 헤더 확인.

| 변경 | 파일 | 이유 |
|---|---|---|
| 띠 궁합·출생연도 운세 4개 경로에만 `Cache-Control: public, max-age=0, must-revalidate` + `Cloudflare-CDN-Cache-Control: max-age=86400, stale-while-revalidate=604800` | `lib/seo/edgeCache.ts`, `next.config.ts`(맨 뒤 규칙) | 브라우저는 지금처럼 매번 확인, Cloudflare 만 하루 보관(+7일은 보관본을 내주며 뒤에서 갱신). 이 헤더는 브라우저로 전달되지 않는다 |
| 같은 주소의 화면 전환용 데이터 요청(`rsc` 등 4개 요청 헤더)에는 붙이지 않음 | 같은 파일의 `missing` 조건 | 운영에서 `RSC: 1` 만 붙여도 페이지 주소로 `text/x-component` 가 200 으로 나온다. 이게 보관되면 다음 방문자가 깨진 화면을 본다 |
| `NEXT_LOCALE` 쿠키 끔(`localeCookie: false`) | `i18n/routing.ts` | 읽는 곳이 없고, `Set-Cookie` 가 붙은 응답은 Cloudflare 가 보관하지 않는다 |
| www → 대표 주소 이동을 `host` 헤더로만 판단, 이동 응답에 두 캐시 헤더 모두 `no-store` | `middleware.ts` | 운영에서 `X-Forwarded-Host: www.kongdak.kr` 를 꾸며 보내면 대표 주소에서도 자기 자신으로 308 이 났다(nginx 가 이 헤더를 덮어쓰지 않음). 보관이 켜지면 요청 한 번으로 그 페이지가 무한 이동에 갇힌다 |
| 배포 때 지난 빌드의 `/_next/static` 파일을 14일간 함께 둠(`/root/.kongdak-static-keep`) | `scripts/safe_deploy.py` | 빌드가 `.next` 를 지우므로 보관 중인 HTML·열어 둔 탭이 가리키는 옛 JS·CSS 가 404 가 된다. 실패해도 배포는 계속된다 |

**Cloudflare 캐시 규칙(2026-10-08 17:34 KST 적용, 소유자 요청으로 대시보드에서 생성)** — 이름 `SEO pages edge cache (zodiac, fortune 2027)`. 코드만으로는 속도가 달라지지 않는다(Cloudflare 는 HTML 을 기본으로 보관하지 않는다):
- 조건: 호스트 `kongdak.kr`, 경로가 `/ko/zodiac` 또는 `/ko/fortune/2027` 로 시작, 쿼리 문자열 없음
- 캐시 대상으로 지정 + Edge TTL "원본의 cache-control 헤더가 있으면 따르고 없으면 보관하지 않음"
- 상태 코드 500 이상은 보관하지 않음
- Browser TTL: 원본 헤더를 따름 — 이게 없으면 Cloudflare 기본값이 브라우저용 `max-age=0` 을 4시간으로 바꿔 내보낸다(적용 직후 실제로 확인하고 추가)

**운영 실측(규칙 적용 후, 한국 PC 기준)**: 보관본이 없는 첫 요청 1.0~1.3초(`MISS`) → 이후 0.25~0.29초(`HIT`). `RSC: 1` 요청은 `BYPASS` 로 보관되지 않고, 쿼리가 붙은 주소·홈·입력 화면·상품 화면은 `DYNAMIC` 그대로다.

## 결정론/보안
- 보관 대상 화면은 서버에서 세션·쿠키를 읽지 않는다. 쿠키·언어·기기를 바꿔 보낸 요청의 본문 해시가 같음을 확인했다. 개인 결과 화면(`/compat/...` 등)은 대상이 아니며 `source` 에 `*` 를 쓰지 않았다(테스트로 고정).
- 시크릿 없음. Cloudflare API 토큰을 쓰지 않는 구성이다(배포 때 자동 비우기 없음).

## 의심 지점
1. 방문이 드문 페이지는 보관본이 없는 첫 요청에서 지금과 같은 시간이 걸린다. 보관은 Cloudflare 지점별이라 네이버 수집기가 닿는 지점에 보관본이 있어야 효과가 난다 — 규칙을 켠 뒤 네이버 수집 현황의 다운로드 시간으로 확인할 것.
2. 검색용 페이지 내용(글·메뉴의 상품 목록)을 고치면 최대 하루(+다음 요청 한 번) 늦게 보인다. 급하면 Cloudflare 에서 해당 주소를 비운다.
3. 없는 띠 주소의 404 와 뒤집힌 주소의 308 에도 보관 헤더가 붙는다(내용이 정해져 있어 무해). 500 은 캐시 규칙의 상태 코드 조건으로 막아야 한다.
4. (기존 동작) `Next-Router-Prefetch: 1` 만 붙이고 `RSC` 없이 보낸 요청은 응답 없이 10초 이상 매달린다(홈 포함, 운영·로컬 동일). 이번 변경과 무관하지만 연결을 붙잡는 요청이라 기록해 둔다.

---

# 추가(2026-10-08 밤) — 광고 도착 화면 머리말과 버튼 가격 표시

> **근거(10-08 실측)**: 인스타 광고 전용 주소 `ig-b1` 164클릭 → 입력 완료 약 25(15%) → 미리보기 약 25 → 결제 1. GA4: 방문자의 12%만 입력을 시작하고, 시작한 사람은 87%가 끝낸다. 결제창을 연 5명 중 4명이 3초 안에 닫았다. 생성 실패 0건·결제 정상이라 고장이 아니라 화면 문제다.
> **검증**: `vitest` 413 통과(신규 `tests/landingCopy.test.ts` 5건) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 휴대폰 폭으로 머리말 확인, 입력 → 미리보기 생성 → 버튼 문구 확인(가로 넘침 없음).

| 변경 | 파일 |
|---|---|
| 상품 입력 화면(`/compat/new?productId=…`, 정통 궁합 제외) 머리말을 그 상품의 질문 + "무료 미리보기 · 가입 없이 30초" + 알려 주는 것 3줄로 교체. 속마음은 광고 영상 B 의 약속과 같은 문장("그 사람, 지금 나를 어떻게 생각할까?") | `lib/landingCopy.ts`(신규), `components/CompatNewClient.tsx`, `app/[locale]/compat/new/page.tsx`(상품 화면에서는 공통 머리말을 그리지 않음) |
| 제출 버튼을 "<상품 이름> 무료로 미리 보기"로, 아래에 "가입도 결제도 없이 바로 볼 수 있어요" | `components/CompatNewClient.tsx` |
| 미리보기의 "이어서 읽기"·"답 보기" 버튼에 가격을 붙이고, 잠긴 칸 위에 "아래 이야기는 전체 리포트(4,900원)에서 열려요" 한 줄 | `components/report/StandardReportView.tsx`(`unlockPrice`), 호출부 `CompatNewClient`·`FortuneNewClient` |
| 궁합 결과 화면 상단 잠금 배너에 가격 | `components/CompatResultClient.tsx` |
| 버튼용 짧은 가격 `basePriceLabel` | `lib/catalog.ts` |
| 미리보기 제목 "우리의 그 사람의 속마음 미리보기" → "그 사람의 속마음 미리보기" | `components/CompatNewClient.tsx` |

## 측정
- 신규 `product_landing_view { productId }` — 상품 머리말이 그려질 때 1회(지난 궁합 이어보기 `from=` 은 제외). 퍼널: `product_landing_view → compat_created → teaser_created → click_unlock_teaser → checkout_open → purchase`.
- 비교 기준(변경 전, 10-08): 클릭 대비 입력 완료 15%, 결제창을 3초 안에 닫은 비율 4/5.

## 결정론/보안/결제
- 가격·결제 로직은 건드리지 않았다. 버튼 문구의 금액은 `product.price`(결제 금액과 같은 출처)에서만 만든다.
- 머리말 문구는 상품별로 고정이다(같은 상품 = 같은 문구, 테스트). 한자·전문용어·단정 표현 검사 포함.
- 로컬 확인 때 운영 DB 에 가짜 생년월일의 궁합 1건·미리보기 1건이 생겼다(10-08 22시경).

## 의심 지점
1. 머리말이 길어져 입력 칸이 첫 화면에서 약 150px 아래로 내려갔다. 입력 시작률이 오히려 떨어지면 안내 3줄을 접는 쪽을 검토.
2. 다른 광고 문구(B1 "답장은 오는데, 마음은 모르겠을 때", B3 "읽씹 3일째…")와 머리말이 글자 그대로 같지는 않다. 소재별로 머리말을 바꾸려면 `utm_content` 를 읽어야 한다.
3. 가격을 먼저 보이면 버튼 누르는 수 자체는 줄 수 있다. 봐야 할 값은 누른 수가 아니라 결제 완료 수다.

## 광고 도착 화면을 홈으로(2026-10-09 새벽, 사장님 결정)
- `lib/campaignLinks.ts`: 인스타 광고 6개(`ig-b1~3`, `ig-a1~3`)의 도착을 입력 화면에서 홈(`/ko?utm_…`)으로. `ig-bio`(프로필 링크)와 커플다이어리 배너(`cd1~4`)는 그대로.
- 근거(인스타 앱 유입, nginx 합계): 홈 도착 37 → 입력 6(16%) → 결제 1 / 입력 화면 도착·옛 머리말 158 → 17(11%) → 1 / 새 머리말 58 → 3(5%) → 결제창 2회 열고 미완료. 표본이 작고 광고 조건도 달라 확정은 아니다. 반반 비교를 권했으나 사장님이 바로 전환을 택했다.
- 유입 집계(`Order.campaign`, `/ko/admin/campaigns`)는 쿠키 기준이라 그대로 동작한다.

## 비회원 홈 맨 위 "함께했어요" 한 줄 + 앱 설치 배너는 회원에게만(2026-10-09 새벽, 사장님 결정)
- `components/home/VisitorPill.tsx`(신규): 두근이 얼굴 3개 + "벌써 N명이 함께했어요". `HomeHeroCompact` 맨 위에 넣었다 — 이 머리말은 비회원에게만 그려지므로 로그인 전에만 보인다. 시안 3종 중 A안(`docs/design-drafts/함께했어요_시안.png`).
- 숫자는 `SiteCounter "visitors"`(같은 기기는 한 번만 센 방문 수, 2026-09-24 시작) 그대로다. 900명부터 보인다(`VISITOR_PILL_MIN_DISPLAY`, 적용 시점 997명). 아래쪽 큰 칸(`VisitorSection`, 1,000명 문턱)은 그대로.
- `components/InstallPWAButton.tsx`: 설치 배너와 `pwa_banner_view` 를 로그인한 회원에게만. 이미 설치한 사람에게 뜨는 알림 켜기 안내는 그대로.
- 검증: `vitest` 414 통과(문턱 테스트 1건 추가) · `tsc` 0 · lint 0 · build exit 0 · 로컬 운영 빌드 휴대폰 폭에서 비회원 홈에 한 줄 표시, 설치 배너 없음(5초 대기), 가로 넘침 0. 회원 화면의 설치 배너는 로그인해서 직접 보지는 않았다(조건 한 줄 변경).
- 측정 이벤트는 추가하지 않았다(누를 수 없는 표시라 행동이 없다). 효과는 홈 도착 → `compat_created` 비율로 본다.
- 의심 지점: "함께했어요"는 방문 수를 뜻한다. 궁합을 본 사람 수로 읽힐 수 있으나 아래 큰 칸에 "방문한 분 · 같은 기기는 한 번만"이라고 적혀 있다.

---

# 추가(2026-10-11) — 사흘간 매출 0원 진단, 10-08 낮 상태로 복원, 배포 오류 수정

> **상황**: 10-09~10-11 방문자 745명(GA4)·인스타 광고 593클릭(약 5만 원)에 결제 0건, 결제 시도(주문 생성)도 0건.
> **고장 여부**: 아니다. 사흘간 사람 요청의 5xx 0건, 입력·생성 API 전부 200. 운영 사이트를 인스타 앱 UA 로 홈 → 입력 → 결과 → 결제 시트 → 카카오페이 화면까지 직접 따라가 정상 확인(10-11 18시, 콘솔 오류·실패 응답 없음).

## 원인(증거 순)
| 관찰 | 숫자 |
|---|---|
| 광고 도착을 홈으로 바꾼 뒤 입력 완료율 하락 | 인스타 클릭 대비 궁합 생성: 10-08(입력 화면 도착) 192클릭 중 26 = 13.5% → 10-09~11(홈 도착) 593클릭 중 47 = 7.9% |
| 홈에 온 사람은 대부분 무료 궁합으로 감(하단 고정 버튼) | 궁합 생성 44명 중 유료 상품 미리보기를 본 사람 23명. 지금까지 결제의 대부분은 "그 사람" 상품 미리보기에서 나왔다(정통 궁합 결제는 1건) |
| 미리보기 버튼에 가격을 붙인 뒤 누르는 사람이 급감 | `click_unlock_teaser`: 10-08 미리보기 12명 중 5명(42%) → 10-09~11 23명 중 2명(9%) |
| 가격을 미리 보여 줘도 결제창을 바로 닫는 비율은 그대로 | 결제창 연 10명 중 6명이 3초 안에 닫음, 결제 버튼 0명 → "가격을 몰라서 닫는다"는 가설은 틀렸다 |
| 결제하던 유입이 사라짐 | 스레드 유입(홈 열림) 10-07 22 → 10-09 8 → 10-10 1 → 10-11 0. 네이버 12 → 3 |

10-08 밤~10-09 새벽에 바꾼 세 가지(상품 머리말, 버튼 가격, 홈 도착)는 모두 효과가 없거나 나빴다. 앞의 둘은 내(Claude) 제안이었다.

## 한 일
1. **10-08 낮(마지막으로 결제가 나온 구성)으로 복원**: 광고 6개 주소 → 상품 입력 화면(`lib/campaignLinks.ts`), 입력 화면 머리말·제출 버튼 원복, 미리보기 버튼의 가격 문구 제거, 궁합 결과 상단 배너 문구 원복. `lib/landingCopy.ts`·`basePriceLabel`·`product_landing_view` 삭제. 미리보기 제목 교정("그 사람의 속마음 미리보기")만 남김.
2. **유지**: 비회원 홈 맨 위 "벌써 N명이 함께했어요", 앱 설치 배너는 회원에게만.
3. **배포 중 오류 수정**(10-09 `ChunkLoadError` 3건): 원인은 `rm -rf .next` 후 같은 자리에 2분간 다시 빌드하는 동안 옛 서버가 방문자를 받는 것. `next.config.ts` 의 `distDir` 가 `NEXT_DIST_DIR` 를 읽게 하고, `scripts/safe_deploy.py` 는 `.next-new` 에 빌드 → 결과 확인 → `mv` 로 교체와 재시작을 한 명령으로. 직전 빌드는 `.next-old` 로 남는다. 빌드 실패 시 `.next` 는 손대지 않는다(이전에는 "옛 버전이 그대로 돈다"는 안내와 달리 `.next` 가 이미 지워져 있었다). `tsconfig.json` 에 `.next-new/types` include 를 넣어 빌드가 tsconfig 를 고쳐 쓰지 않게 했다. 로컬에서 다른 폴더 빌드 → 이름 바꿔 실행해 화면·API·OG 이미지 200 확인.
4. **`ProductVisibility DB timeout`**: 서버 재시작 직후 미국 DB 첫 연결이 1.5초를 넘겨 기본값으로 떨어지던 것. 기다리는 시간을 4초로, 실패하면 15초 동안은 다시 두드리지 않고 기본값 사용(`lib/catalogVisibility.ts`). 기능 영향은 없던 경고다.
5. `인증이 필요합니다` 1건은 로그인 없이 `/admin` 을 연 요청이다(정상 차단).

## 검증
`vitest` 409 통과 · `tsc` 0 · 변경 파일 lint 0 · build exit 0(다른 폴더 빌드 포함, tsconfig 변화 없음).

## 의심 지점
1. 복원해도 인스타 "게시물 홍보" 클릭의 결제율은 지금까지 0.3~0.6% 였다(클릭당 약 100원, 회수 약 30원). 화면을 고쳐서 본전이 될 가능성은 낮고, 유입의 질이 더 큰 변수다.
2. 로컬·운영 직접 확인으로 운영 DB 에 가짜 생년월일 궁합 1건과 PENDING 주문 1건이 생겼다(10-11 18시경).
3. 새 배포 방식은 이번이 첫 실전이다.

---

# 추가(2026-10-13) — 연말 특가(12/31까지)와 홈 강조 영역

> **결정(사장님)**: 2026년 총운 4,900 → 3,000원, 2027 대운 프리미엄 리포트 19,900 → 9,900원, 2027년 신년운은 그대로. 2026-12-31 23:59(KST)까지. 스레드 한 달 홍보와 함께 간다.
> **기준선**: 9/24 이후 2026 총운 결제 2건, 대운 프리미엄 0건(결제 시도도 0건).
> **검증**: `vitest` 413 통과(특가 테스트 4건 추가) · `tsc` 0 · 변경 파일 lint 0 · build exit 0 · 로컬 운영 빌드에서 홈·상품 상세·구조화 데이터 가격 확인.

## 결정론/결제(가장 중요한 부분)
- `lib/catalog.ts`: 두 상품의 `price`·`originalPrice` 를 **읽는 순간의 시각**으로 계산되게 했다(`Object.defineProperty` getter, `seasonPriceAt(id, now)`). 화면 표시·서버 주문 금액(`app/api/payments/order/route.ts` 의 `catalogItem.price`)·세트 비교가 모두 같은 값을 본다. 호출부를 하나씩 고치는 방식은 한 곳만 빠져도 보이는 값과 결제 값이 어긋나서 택하지 않았다.
- 2027-01-01 00:00(KST)부터는 배포 없이 원래 값(4,900 / 19,900)으로 돌아간다. 경계는 테스트로 고정(12-31 23:59:59 = 특가, 01-01 00:00:00 = 원래 값).
- 기간 중 취소선 값은 직전까지 실제로 받던 값이다(총운 4,900, 대운 19,900). 딱지는 `discountBadge()` — "연말 특가 · 12/31까지".
- 회원 첫 결제 규칙·PG 금액 검증은 건드리지 않았다(주문에 저장된 금액으로 검증).

## 화면
- `components/home/SeasonPromoBanner.tsx`(신규): 홈 머리말 바로 아래(회원·비회원 모두). 특가 2개 카드(직전 가격 취소선, 남은 날 D-n) + 기본 혜택 3가지. 기간이 끝나거나 상품을 숨기면 사라진다.
- 홈 격자에 "특가" 딱지, 프리미엄 목록·띠·상세에 취소선과 기한.
- 격자 아래 "전체 리포트 ○원" 안내는 특가가 아닌 상품 값으로(탭 전체가 3,000원처럼 보이지 않게).
- **세트**: 취업/이직 세트(7,900) = 취업운 4,900 + 2026 총운 3,000 이 되어 기간 중 아끼는 금액이 0이다. 홈 "세트로 한 번에"에서 따로 사는 것보다 싸지 않은 세트는 내보이지 않게 했다(`SetRow`). 추천(`setsContaining`)·상세의 "따로 사면" 문구는 원래부터 같은 조건으로 숨는다.
- 약관 제9조에 기간 한정 가격 한 줄, 개정 표기 추가(`messages/ko.json`).

## 측정
- `season_promo_view { items }` — 특가 영역이 화면에 보인 순간 1회. `home_card_click { section: "season_promo", productId }`.
- 판단: 두 상품의 결제 건수를 위 기준선과 견준다.

## 의심 지점
1. 브라우저 쪽 가격 표시는 방문자 기기의 시계를 따른다. 시계가 틀린 기기는 화면 값과 결제 값이 다를 수 있다(결제 금액은 서버 시각 기준, 결제창에 금액이 다시 표시된다).
2. 12/31 까지면 2027 운세 성수기(12월)에도 대운 리포트를 절반 값에 팔게 된다.
3. 홈 구조를 또 바꿨다. 광고 유입은 입력 화면으로 가므로 주로 스레드·검색·직접 방문에 영향이 간다.

---

# 2026-10-14 · Gemini 4 UI/UX 1차 병합 (P-001a·P-002a·P-001b)

> 절차: `docs/uiux/` — Gemini 제안 → Claude 결정서(`decisions/`) → Gemini 구현(`uiux/P-00N` 브랜치) → Claude 검토·수정·병합·배포.
> **검증**: `tsc` 0 · 변경 파일 lint 0 · `vitest` 420 통과 · build exit 0 · 로컬 운영 빌드(kongdak.local:3099, GA 전송·`/api/*` 가로채서 끊음)에서 GA 전송값 확인.

## 무엇이 바뀌나
- **P-001a 측정**: GA4 이벤트가 지금 보는 화면 주소로 잡힌다(`lib/gtag.ts`가 이벤트마다 `page_location`을 싣고, `components/Analytics.tsx`가 화면 이동 때 `gtag('set')`). 상품 상세 버튼 `product_cta_click`, 관련 상품 `related_product_click` 추가. `DashboardView`의 직접 `gtag` 호출을 `trackEvent`로.
- **P-002a**: 두 사람 상품 미리보기(또는 한도 안내)가 뜨면 주소에 `from=<궁합 id>`를 넣는다(`replaceState`, `lib/compatFromUrl.ts`). 새로고침·인앱 → 다른 브라우저로 열어도 입력 없이 같은 미리보기. 같은 id로 효과가 다시 돌지 않게 막았다(`handledFromRef`).
- **P-001b 어드민**: 첫 탭이 지표. 재구매(같은 궁합·같은 회원, 세트에 든 단품 재결제 표시), 상품별 미완료 열, 접속 환경·유입 표시·결제 수단 표. 미리보기 수는 저장본 재열람 제외. `Order.payMethod`(KAKAOPAY|CARD|null) 추가 — **운영 DB에 칸을 먼저 추가함(10-14, `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "payMethod" TEXT`)**.

## Claude가 Gemini 구현에서 바꾼 것
1. `components/Analytics.tsx`: Gemini 판은 GA 스크립트가 **주소창의 `paymentId`를 직접 지우고**(`History.prototype.replaceState`), `history.pushState/replaceState`를 `defineProperty` 게터로 덮어썼다. 결제 완료 화면은 마운트 뒤 주소에서 `paymentId`를 읽어 결제를 확정하므로, 순서가 어긋나면 결제 확정이 안 된다. Next 라우터의 history 처리와도 부딪힐 수 있다. → 원래 스크립트로 되돌리고 `gtag('set', { page_location })` 한 줄과 공통 지우기 목록만 넣었다.
2. `withCompatFromParam`을 클라이언트 컴포넌트에서 `lib/compatFromUrl.ts`로 옮김(가짜 도메인 `saju.kongdak.com` 제거).
3. 어드민의 `payMethod` 별도 원시 조회(`$queryRaw` + 실패 시 빈 값)를 없애고 `select`에 넣음(칸을 먼저 만들었으므로).

## 확인(로컬 운영 빌드)
- `/ko/products/inner_mind` → 하단 버튼 → `/ko/compat/new`: `view_item`·`product_cta_click`의 주소 = 상품 상세, 상품 상세 체류 시간(`user_engagement`)도 상품 상세 주소, 화면 이동 1번에 `page_view` 1번(GA가 같은 전송을 두 주소로 보내 패킷은 두 벌).
- `/ko/pay/complete?paymentId=…&orderId=…&claimToken=…&token=…`: GA 전송값 어디에도 네 값 없음(0건). 화면은 `paymentId`를 읽어 `/api/payments/complete`를 호출함(주소 정리는 화면이 함).

## 의심 지점
1. 미리보기 화면 주소가 바뀔 때 GA가 `page_view`를 한 번 더 보낼 수 있다(`from` 붙은 주소). 미리보기 수는 `teaser_created`로 보고, `via=compat_continue`(새로고침·다른 브라우저 재열람)는 빼고 본다.
2. `from=` 주소를 남에게 보내면 그 두 사람의 미리보기가 열린다. 궁합 id는 원래 공유 주소에 쓰이는 값이라 새로 드러나는 것은 없지만, 속궁합처럼 민감한 상품 미리보기도 열린다.
3. 어드민 집계는 최근 주문 300건 기준이다(지금 62건).

## 추가 수정(같은 날, 커밋 보안 검토 지적)
- 지적: 결제 완료 주소의 `paymentId`가 GA의 이전 주소(`page_referrer`)로 나갈 수 있다.
- 로컬 패킷으로 재현: 비밀값이 붙은 주소에서 gtag.js가 먼저 뜨면, 설정(`page_location`)을 지워도 gtag.js가 그 주소를 기억했다가 다음 화면의 `page_view`·`user_engagement`에 `dr`로 보냈다(8건). 이번 변경 전 코드에도 있던 경로다. 실제 결제 완료 화면은 마운트 직후 주소를 정리해 재현되지 않았지만, 기기에 따라 순서가 바뀔 수 있다.
- 수정(`components/Analytics.tsx`): 주소에 지울 값이 있는 동안에는 gtag.js를 **불러오지도** 설정하지도 않는다. 정리되면(50ms 간격, 최대 10초) 그때 불러온다. 정리되지 않으면 그 화면은 측정하지 않는다. 주소창은 건드리지 않는다.
- 확인: 상품 흐름·결제 완료 화면·정리되지 않는 화면 → 다른 화면, 세 경우 모두 GA 전송값의 비밀값 0건.

---

# 2026-10-15 · 프리미엄 입력 화면 글씨 안 보임 + 전 페이지 대비 점검
- 원인: 공용 `components/forms/BirthFields.tsx`는 밝은 화면용(흰 칸, 글자색 지정 없음, 회색 제목). 어두운 프리미엄 입력 화면(`/ko/premium/<id>/new`)에 그대로 들어가 흰 칸에 밝은 글씨·어두운 바탕에 어두운 제목이 됐다.
- 수정: `tone="light" | "dark"` 추가(밝은 쪽도 글자색 `text-ink`를 명시). 프리미엄 3곳(2027 대운, 택일 두 사람) `tone="dark"`. 커밋 54d5783(입력 칸), be1144c(대비), 둘 다 배포 VERIFIED.
- 전 페이지 대비 검사(390px, 사이트맵 + 입력 흐름 49쪽): 대비 3 미만 6쪽 → 1쪽. 고친 것: "NEW" 딱지(#FF8AA1→#E0245A), 재물 딱지 글씨(#C98A0B→#8A5A00), 흐린 회색 안내 글씨 `text-[#8A8291]` 43곳 → `text-caption`(#6B6470). 남은 1곳은 네이버 로그인 버튼(네이버 지정 색).
- 의심 지점: 결과·미리보기·결제창처럼 데이터가 있어야 열리는 화면은 자동 검사에 들어가지 않았다(코드로 확인한 범위: 프리미엄 화면에 들어가는 공용 부품 중 밝은 전용은 BirthFields 하나였다).

---

# 2026-10-15 · 보안 점검(바이브코딩 보안 체크리스트 기준)
- 계기: "프론트에 키 노출 · SQL 주입 · 인증 없는 API" 체크리스트. 결과와 조치를 정리한다.
- 문제없음으로 확인: 브라우저 번들(라이브 JS 21개)에 API 키·DB 주소·토큰·프롬프트 원문 0건, `NEXT_PUBLIC_` 비밀값 없음, 추적되는 시크릿 파일 없음(`.env.example`만), git 이력 시크릿 0건, `$queryRawUnsafe` 없음(Prisma 매개변수 쿼리), Supabase public 표 25개 전부 RLS 켜짐(정책 0 = anon 접근 불가) + 서버에 Supabase 키 자체가 없음, 관리자 API 전부 `getAdminSessionOrThrow`(401/403), 유료 결과는 `isEntitled`/주문번호로만 열람, 보안 헤더(CSP·HSTS preload·X-Frame-Options DENY·nosniff) 적용.
- 조치 1 (커밋 21db6d0, 배포 VERIFIED): Next.js 16.2.9 → 16.3.8, next-auth 4.24.14 → 4.24.15. 공유카드(`next/og`)와 이미지 최적화(AVIF) 경로의 인증 없는 원격 코드 실행(critical) 등. `npm audit --omit=dev` critical 2 → 0. 남은 high/moderate 11건은 Prisma CLI 로컬 개발 서버(hono·mysql2)·Tailwind·ESLint 등 빌드 도구 안에만 있다(Prisma 6으로 내리는 것만 해결책이라 보류).
- 조치 2: Gumroad 결제 알림(`/api/webhooks/gumroad`)이 서버에 비밀값이 없으면 검증 없이 받던 것을 **비밀값 없으면 503**으로 바꿈. 이전에는 아무나 회원 이메일로 가짜 결제 알림을 보내 유료 등급을 줄 수 있었다(동면 코드라 삭제는 안 함). 테스트 `tests/routes/gumroadWebhook.test.ts`.
- 조치 3: 이메일 로그인(같은 이메일 5회/분·30회/일)과 가입(같은 IP 5회/분·30회/일)에 횟수 제한(`checkAuthRateLimit`). 막히면 "로그인 시도가 너무 많아요" 안내. 테스트 `tests/authRateLimit.test.ts`.
- 조치 4: 쓰이지 않던 `lib/supabaseClient.ts` 삭제(서비스 롤 키 → anon 키 순으로 넘어가는 위험한 기본값).
- 검증: tsc 0 · 바꾼 파일 lint 새 오류 0(register의 `any` 2건은 기존) · vitest 426 통과 · build exit 0.
- 의심 지점: (1) 횟수 제한은 Upstash가 없으면 PM2 프로세스 메모리에 센다(재시작하면 초기화, 여러 프로세스면 프로세스별). (2) 남의 이메일로 로그인을 반복하면 그 사람의 이메일 로그인이 하루 막힐 수 있다(카카오·구글 로그인은 영향 없음). (3) `GET /api/compat?id=`는 id를 아는 사람에게 유료 결과를 돌려준다(id는 추측 불가한 cuid라 유지).

---

# 2026-10-15 · 회원 첫 결제 할인 폐지(사장님 결정)
- 결정: 첫 결제 할인은 없앤다. 표준 단품은 회원·비회원 모두 오픈 기념가 4,900원(취소선 6,900원) 그대로.
- 이유(코드 측): 지금은 기념가 = 첫 결제가(4,900)라 꺼져 있었지만, 기념가를 6,900원으로 되돌리면 자동으로 살아나는 구조였다.
- 바꾼 것: 서버 주문 금액에서 할인 제거(`app/api/payments/order/route.ts`), `priceLabel`의 "회원 첫 결제" 꼬리·`hasFirstPurchaseDiscount`·`FIRST_PURCHASE_PRICE` 삭제(`lib/catalog.ts`), 결제창 "가입하면 첫 결제는" 안내, 맛보기 결제 카드·한도 화면·상품 상세의 첫 결제 표시, 회원 홈 `FirstPurchaseCard`와 `/api/user/first-purchase`, `lib/payments/firstPurchase.ts` 삭제, 약관 제9조의 "회원의 첫 결제 1회는 4,900원" 삭제.
- 남긴 것: 관리자 화면의 "첫 결제(4,900원) 대 정가 결제" 집계는 과거 주문 분류용으로 `LEGACY_FIRST_PURCHASE_PRICE`(4,900)를 쓴다. 쓰이지 않는 `components/PricingClient.tsx`(`/pricing`은 홈으로 이동)의 옛 문구는 화면에 나오지 않아 그대로 뒀다.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 423 통과(첫 결제 안내 API 테스트 3건 삭제, 모든 상품 라벨에 "첫 결제"가 없다는 검사 추가, 결제한 적 없는 회원도 판매가 그대로 청구) · build exit 0.
- 의심 지점: GA4 `first_purchase_banner_click`, `checkout_login_hint_click` 이벤트는 더 이상 나오지 않는다.

---

# 2026-10-15 · MP-1 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/MP_매출UX마스터플랜.md` 1묶음. 결과 보고: `docs/uiux/results/MP-1.md`. 커밋 dff1bb6 · 9f7f911 · 5038f00 · 3345ed5 · 23c782f + 검토 수정 1건.
- 1 길일 택일: 가짜 1994·1996 초기값 제거, 빈 생년월일이면 맛보기·결제 모두 막힘(`buildDateSelectionPayload`, 테스트 5케이스). 저장된 커플·본인 정보가 있으면 채움. 이름 칸은 원래 화면에 없어 빈 이름은 "나"로 보냄(택일 생성은 이름을 쓰지 않음).
- 2 취업·이직 세트 연말특가 6,900원(따로 7,900원), 1/1부터 7,900원(따로 9,800원). 약관 제9조 갱신.
- 3 2026·2027 총운: 상품 상세 버튼과 홈 연말특가 배너 → `/fortune/annual?year=`.
- 4 정통 궁합: 권한이 있으면 심층 리포트를 화면당 1회 자동 시작·스크롤, 실패 시 재시도 없이 버튼. 이미 만든 리포트는 서버 캐시라 재방문 비용 없음(대신 재방문 때도 그 영역으로 스크롤된다).
- 5 하단 고정 바: 결제 카드가 보이면 숨김.
- 검토에서 고친 것: Gemini가 `paywallRef`를 카드 전체로 옮겨 `view_paywall`(useSeenOnce, threshold 0.5)이 긴 카드에서 늦게·안 잡힐 수 있었다 → 카드 맨 위 0높이 표시점으로 되돌리고 숨김 판단만 `paywallCardRef`로.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 424 통과 · build exit 0.
- 판정: 2주 뒤 annual_2026/2027 `teaser_created → checkout_open → purchase`를 직전 2주와 비교, 세트 결제 수 기록.

---

# 2026-10-16 · P-007 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/P-007.md`, 문구 `decisions/P-007_문구.md`. 커밋 41afca7(ⓐ 권유) · 373e00b(ⓑ 회원 판별) · 7b31fc9(ⓒ 문구) + 검토 수정 1건.
- ⓐ 두 사람 리포트 끝(`ReportViewClient`, 두 사람 상품일 때)과 정통 궁합 심층 리포트 끝(`CompatResultClient`)에 "두 사람 사주로 이어서 볼 수 있어요" 권유: 단품 최대 2개 + 세트 1줄. 표 `lib/recommendations/nextReadings.ts`(7종, id만). 같은 궁합으로 가진 것(이 기기 주문 → `/api/payments/owned` 검증, 회원은 `/api/reports/mine`)·숨긴 상품은 빼고, 확인 중·실패 시 그리지 않음. `/api/reports/view` 응답에 `compatId` 추가. 이동 `/compat/new?productId=&from=&via=next` → `teaser_created.via = next_reading`. 이벤트 `view_next_reading`, `click_next_reading`.
- ⓑ `/compat/[id]` 회원 열람 판별을 `isEntitled`로(`resolveCompatPageEntitlement`): 정통 궁합·그것이 든 세트를 산 회원은 다른 기기에서도 열림. 비회원은 조회 추가 없음. MP-1의 자동 시작과 이어져 그 회원은 심층 리포트가 바로 열린다.
- ⓒ 잠긴 궁합 화면 결제 버튼 아래 "이미 결제하셨나요?" 한 줄 + 로그인 링크, 결제 완료 카카오톡 메시지 설명·버튼 글자.
- 검토에서 고친 것: Gemini가 반려된 문구 초안을 그대로 넣었고 버튼 글자 변경과 `owned_hint_login_click`이 빠져 있었다 → 승인본으로 맞춤.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 437 통과 · build exit 0.
- 의심 지점: 권유로 들어간 미리보기 주소에 `via=next`가 남아 새로고침하면 `teaser_created(via=next_reading)`가 한 번 더 잡힌다. 판정 때 같은 궁합·상품의 중복은 하나로 센다.
- 판정: 배포 후 21일(11-06) 또는 새 결제 쌍 20개 중 먼저. 같은 두 사람의 7일 내 두 번째 결제 비율(기준 13쌍 중 3쌍).

---

# 2026-10-16 · MP-2 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/MP-2.md`. 커밋 6c9b105(a 게이지) · 3fbf78b(c 흐림 문구) · 8ae1b1f(d 홈 바로가기) · f00c4ab(e 저장 정보 바로 보기) + 검토 수정 1건. (b) 분량 배지는 반려.
- (a) 궁합 점수 아래 "궁합 점수 세부 분석": 공개 3축(타고난 성향 합 / 두 사람 기운의 균형 / 에너지 온도 조화) + 잠금 2축(서로 채워 주는 정도 / 일상·감정 리듬). 미결제 페이지는 공개 3축 숫자만 받는다(`pickPublicBreakdown`). 잠긴 값은 `/api/compat/deep-report` 성공 응답(권한 확인 뒤, 캐시 포함)에만 `breakdown`으로 실린다. 잠긴 줄 → `checkout_open source=click_gauge_lock`. 매핑 `lib/compatGauge.ts`.
- (c) 맛보기 흐림 문구를 유료 단품 12종별로(`lib/teaserBlurCopy.ts`, 각 상품 2~4번째 유료 섹션 제목을 그대로 옮김). 나머지는 기존 문구.
- (d) 비회원 홈 첫 화면 버튼 2개(우리 궁합 무료로 보기 → /compat/new, 2027 신년운 미리보기 → /fortune/annual?year=2027), `home_hero_cta_click`.
- (e) 상품 상세: 같은 탭에 방금 입력한 정보가 있으면 "저장된 … 정보로 바로 보기"(위·하단 고정) + "다른 생년월일로 새로 입력하기". `product_cta_click location=saved_info_hero|saved_info_sticky`, 두 사람 상품은 `teaser_created.via=saved_detail`.
- 검토에서 고친 것: 결제 후 점수 아래 카드가 5축 전체로 풀리는데 심층 리포트 안에 같은 카드가 한 번 더 있었다 → 뺌. `lib/destinyGen.ts`(타입 한 줄 추가뿐)의 import 를 파일 머리로.
- 검증: tsc 0 · 바꾼 파일 lint 새 오류 0(deep-report `any` 3건은 기존) · vitest 444 통과 · build exit 0.
- 판정: (d) 14일 `home_hero_cta_click`/비회원 홈 세션 ≥ 3%, (e) `saved_info_*` 클릭과 `teaser_created` 도달, (a)(c)는 기능 확인 + 결제 열기 비율이 떨어지지 않는지.

---

# 2026-10-16 · P-008 반쪽 궁합 초대장 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/P-008.md`. 커밋 beb1cc6(표·API·초대 화면) · 9259a46(입구 2곳) · a53d026(카톡 카드·OG) · 2152a53(개인정보처리방침) + 검토 수정 fe7707b.
- 흐름: `/compat/new` 상대방 카드의 "생일을 모르나요? 반쪽 초대장 보내기"(또는 궁합 결과 공유 아래 버튼 → `?mode=invite`) → 내 정보만으로 `POST /api/compat/invite` → 카톡/링크 `/ko/compat/invite/<token>` → 받는 사람이 자기 생년월일 + "동의하고 우리 궁합 열기" → `POST /api/compat/invite/<token>`가 일반 궁합과 같은 `Compatibility` 행을 만들고 결과로 이동. 보낸 사람은 같은 링크 또는 `/compat/new` 상단 배너로 결과를 연다.
- 개인정보: 원문 생년월일·시간 저장 없음. `CompatInvite.personA`(사주 계산값 = 생년월일을 추정할 수 있는 값)는 응답에 싣지 않고, 완성 즉시 `{}`, 미완성은 72시간 뒤 삭제(생성·조회 때마다 정리). 완성된 행은 결과 연결만 남긴다. 보낸 사람 브라우저에는 토큰과 시각만.
- 운영 DB: 10-16 Claude가 `CompatInvite` 표 + 인덱스 3개를 추가하고 RLS를 켰다(배포 스크립트의 `prisma db push`는 이후 차이 없음).
- 검토에서 고친 것: ① 화면 두 곳이 서버 파일(`lib/compatInvite.ts`)을 가져와 **lunar-javascript 만세력 표가 브라우저 코드에 실렸다**(빌드 산출물에서 "癸亥"·"SolarUtil" 확인) → 브라우저용 `lib/compatInviteClient.ts` 분리, 분리 후 0건. ② 생년월일 해시에 코드에 적힌 대체 pepper가 있었다 → 기존 궁합과 같은 fail-closed, 서버 오류 문구는 손님에게 숨김. ③ 동시에 두 사람이 채우면 궁합이 둘 생길 수 있었다 → `updateMany`로 1회 선점. ④ `compat_created via=half_invite`, `compat_invite_opened isSender`. ⑤ 개인정보처리방침에 "생년월일을 추정할 수 있는 값" 명시.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 453 통과(초대 9건) · build exit 0.
- 판정(배포 후 21일, 11-06): `compat_invite_shared` ≥ 10 또는 입력 진입자의 3%, `compat_invite_completed` ≥ 3, 직접 `compat_created`가 줄지 않으면 유지. 공유 3건 미만 또는 완성 0건이면 입력 화면 전환 버튼을 접는다.

---

# 2026-10-16 · P-009 제휴 정산 정확도 + 제휴사별 성과 보기 병합(Gemini 구현, Claude 검토·수정)
- 결정서: `docs/uiux/decisions/P-009.md`. 커밋 797703e(A) · 9d73915(B) + 검토 수정 b12cdb3.
- A: `/go`가 `kd_ref`(httpOnly 아님, "<코드>.<초>")를 함께 심고, 인앱 "외부 브라우저로 열기"·링크 복사 주소에 `ksrc`·`ksrct`를 붙인다. `middleware.ts`가 등록된 코드·30일 안 시각만 받아 쿠키를 다시 심고(더 최근 클릭이 있으면 유지, 클릭 수는 안 셈) 두 값을 뺀 주소로 302.
- B: `/ko/partner/<partner>/<key>`(key = HMAC(PARTNER_REPORT_SECRET, partner) 앞 32자, 비밀값 없으면 404). 그 제휴사 코드의 클릭·가입·결제·매출·정산 기준(부가세·환불 제외)만. GA·픽셀 안 보냄, noindex, robots 차단. 관리자 `/ko/admin/campaigns`에 제휴사별 공유 주소 복사.
- 운영: `PARTNER_REPORT_SECRET`을 10-16 서버 `.env`에서 직접 생성(값은 어디에도 출력하지 않음).
- 검토에서 고친 것: ① `lib/inAppBrowser`(화면 7곳이 씀)가 `lib/campaignLinks`를 가져와 **전체 제휴 목록·수수료율이 공개 JS에 실렸다** → 브라우저용 `lib/campaignHandoff.ts` 분리(형식만 확인, 등록 여부는 서버가 확인), 빌드 산출물에서 0건 확인. ② 제휴사 화면 클라이언트가 집계 파일 값을 가져와 같은 문제 → `lib/rateLabel.ts`. ③ 커플다이어리에 `rsRate 0.3`이 들어가 제휴사 화면에 예상 정산액이 떴다 → 삭제(2026년 말까지 무료 제휴). ④ 회원 경로(`User.campaign`) 결제가 기간 제한 없이 실적으로 잡혔다 → `attributedCampaign`: 가입 후 30일 안만(관리자·제휴사 화면 같은 기준). 관리자 화면의 기존 누적 숫자가 조금 줄 수 있다.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 467 통과 · build exit 0.

---

# 2026-10-18 · P-010 무료 궁합 → 같은 두 사람 미리보기 + 상품 입력 화면 문구 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-010.md`(Gemini의 경쟁사 비교 진단을 실제 화면·DB로 확인한 결과 포함). 커밋 c8ec8ad(A) · 6c89338(B).
- 왜: 10-01~10-18 궁합 약 270건이 무료 궁합에서 멈췄고, 같은 두 사람으로 '그 사람' 미리보기를 여는 길은 결제한 뒤에만 보였다. 사람 수 대비 상품 미리보기가 무료 궁합보다 약 3배 잘 팔린다.
- A: 무료 궁합 결과(결제 전, 관계가 친구가 아닐 때) "우리 사이의 진짜 케미" 아래에 "이 두 사람으로 더 보기" — 속마음·속궁합 카드 2개, 가격 없이 "무료 미리보기 →", `via=free_result`. `NextReadingRecommendations`에 `variant="free_preview"`, `sourceScreen="compat_free"`.
- B: `/compat/new?productId=<두 사람 상품>` 제목 = 상품 `hook`, 제출 버튼 = "<상품명> 무료 미리보기 ✨", 미리보기·한도 화면에서는 제목 숨김(제목을 서버 페이지에서 `CompatNewClient`로 옮김). 상품 상세 하단 버튼도 "<상품명> 무료 미리보기". 정통 궁합은 그대로.
- 검토: diff 직접 확인(가격·결제·엔진·스키마·이벤트 이름 변경 없음, 새 이벤트 없음 — 기존 이벤트에 `source_screen` 값만 같이 보냄). 수정 없음.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 467 통과 · build exit 0 · `.next/static`에 "癸亥"/"SolarUtil" 0건.
- 판정(배포 후 7일, 10-25): 비교 전 10-12~10-18 궁합 173 · 미리보기 64(궁합 100건당 37) · 결제 9. 목표 궁합 100건당 미리보기 55 이상, `teaser_created via=free_result` 수, 결제 건수. 표본이 작으면 14일까지.

---

# 2026-10-18 · P-011 미리보기 읽기 버튼 → 결제 안내 카드로 이동 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-011.md`. 커밋 f7b516d.
- 바꾼 것: 두 사람·한 사람 상품 미리보기의 "이어서 읽기"·"답 보기"·잠금 카드·총운 달 티저/잠금 영역은 결제창 대신 결제 안내 카드(`#teaser-unlock`)로 스크롤하고 1.2초 강조(`revealUnlockPanel`, 카드가 없으면 예전처럼 결제창). 안내 카드 버튼·하단 고정 바는 그대로 결제창. `click_unlock_teaser`에 `to: "panel" | "checkout"` 추가(한도 화면은 값 없음).
- 검토: diff 직접 확인, 수정 없음. 강조용 `ring-coral` 클래스가 빌드 CSS에 들어간 것 확인.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 471 통과 · build exit 0 · `.next/static` 만세력 0건.
- 기준값(GA4 10-05~10-18, 이벤트 수): checkout_open 115 → checkout_close_fast 56(49%) · checkout_submit 26(23%) · purchase_confirmed 18. teaser_created 229. checkout_open에는 무료 궁합 결과 화면(이번에 안 바꿈)도 섞여 있다.
- 판정(10-25, 부족하면 11-01): 3초 안 닫기 49% → 30% 이하, 열림 → 진행 23% → 30% 이상, 미리보기 100건당 결제 유지. 결제창 열림이 절반 아래로 줄고 결제도 줄면 되돌린다.

---

# 2026-10-18 · P-012 단품 상세 "결과 예시" 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-012.md`. 커밋 0d47256(A 샘플) · 84b7c8b(B 화면).
- A: `scripts/build_standard_samples.ts`가 가상 인물(지민 / 지민·서준)로 실제 생성 경로(`calculateFourPillars`·`calculateCompatibility`·`sajuContextBlock`/`compatContextBlock`·`buildStandardPrompt`·`generateJson`+검증기)를 그대로 돌려 유료 단품 12개 전체 리포트를 `data/samples/standard/*.json`에 저장. DB는 사전 읽기만. 저장 전 검사 `lib/reports/standardSampleGuard.ts`.
- B: 서버 페이지가 그 상품 샘플 1개만 읽어(`lib/reports/standardSamplePreview.ts`) 점수·제목·요약·첫 장 앞 300자(문장 끝)·나머지 장 첫 문장 60자만 props로 넘김. "이런 내용을 확인할 수 있어요" 아래 "결과 예시"(가상 인물 표시, 워터마크, 끝 흐림, 정적 잠금 줄). 새 이벤트 `sample_preview_view { productId }`.
- 검토: 12개 샘플 본문을 직접 읽음 — 한자·전문용어·단정 표현 0, 실제 리포트와 같은 "흙 기운/바다 물 기운" 비유. 매운맛 총운은 상품 성격대로 직설적("이대로 가면 … 낭비될 겁니다"). 건강운에 병명·진단 표현 없음. 수정 없음.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 476 통과 · build exit 0 · `.next/static`에 만세력·프롬프트·샘플 뒷부분 문장 0건. 상품 상세는 동적 페이지(엣지 캐시 대상 아님).
- 기준값(GA4 10-05~10-18): `view_item` 690회/272명 → `product_cta_click` 53회/18명(사용자 기준 6.6%).
- 판정(10-25~11-01): 상세 → 하단 버튼 비율이 6.6%보다 오르는지, `sample_preview_view`/`view_item`(예시까지 내려 본 비율), 상세에서 시작한 미리보기의 결제가 줄지 않는지.

---

# 2026-10-18 · P-013 2026 총운 화면 연말 특가 표시 연결 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-013.md`. 커밋 831b640.
- 왜: 홈 연말 특가 배너는 2주간 430명이 봤지만 특가 시작(10-13) 뒤 2026 총운 결제 0건. 배너가 보내는 `/ko/fortune/annual?year=2026`에는 특가 표시가 없고, 5대 영역 카드마다 같은 문장이 5번 반복, 점수 꼬리표가 "대길·길함".
- 바꾼 것(`AnnualFortuneClient.tsx`): `getAnnualSeasonPromo(year, now)` — 특가 중인 연도만 입력 화면 한 줄("연말 특가 · 전체 리포트 4,900원 → 3,000원 · 12/31까지")과 결과 화면 가격 3곳(위 띠·단건 안내·하단 바)에 취소선 + "연말 특가 · 12/31까지" 꼬리표. 값은 모두 `lib/catalog.ts`에서, 특가가 끝나면 저절로 사라짐. 2027은 그대로. 반복 문장은 카드 아래 한 번("영역마다 좋은 때와 조심할 때…"). 점수 꼬리표 쉬운 말(`getAnnualScoreRating`).
- 검토: diff 직접 확인, 수정 없음.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 480 통과 · build exit 0 · 만세력 0건.
- 판정(14일, 11-01): 2026 총운 결제(10-13~10-18 0건), annual_2026 checkout_open. 결제가 계속 없으면 화면이 아니라 상품(10월에 "2026 한 해") 문제로 보고 사장님께 배너에 2027 신년운을 넣는 안을 제안.

---

# 2026-10-19 · P-014 외국인용 무료 궁합 1단계(en/ja/zh) + 반지대학 언어 선택 화면 병합(Gemini 구현, Claude 검토)
- 결정서: `docs/uiux/decisions/P-014.md`(사장님 10-19 결정: 반지대학 홍대·명동 외국인 40~50% → 영어·일본어·중국어 간체, 궁합만, 결제는 2단계 페이팔 $4.99). 커밋 8adb000(A) · 9a2a7da(B) · a9dda72(C).
- A: `/ko/welcome` 언어 선택(휴대폰 언어 버튼 강조, 자동 이동 없음, utm 전달, `welcome_language_click`) → 한국어 `/ko/compat/new`, 외국어 `/{en|ja|zh}/couple`. 외국어 화면은 `components/global/`에 새로 만듦(한국어 Compat 컴포넌트 미사용). 결제·잠금·세트 없음. 키워드·세부 점수 번역 표는 `messages/{en,ja,zh}.json` `Couple`. `/welcome`·`/couple`·`/legal`에서는 한국어 Navbar/Footer 대신 `GlobalChrome`. `kd-ringuniv` 도착 `/welcome`.
- B: `Compatibility.locale`(추가 칸, 운영 DB에 Claude가 10-19 `ALTER TABLE … ADD COLUMN IF NOT EXISTS "locale" TEXT` 적용). `generate-compat`은 요청이 아니라 궁합의 locale로 언어 결정, `buildCompatPrompt(…, lang)` 외국어 분기(한국어 경로 문자열 불변 — 테스트), `validateCompatOutputLanguage`(한글 0, 영어는 한자 0) 실패 시 1회 재생성. `LOCALE_CONFIG.zh`.
- C: `/{en|ja|zh}/legal/{terms,privacy,refund}` 영어 한 벌(noindex), 외국어 공유 카드.
- 검토: diff 직접 확인, 수정 없음. 참고 — 외국어 무료 해석의 "아직 말하지 않은 것" 줄은 답(심층 궁합)이 2단계라 지금은 열린 질문으로만 남는다.
- 검증: tsc 0 · 바꾼 파일 lint 0 · vitest 494 통과 · build exit 0 · `.next/static` 만세력·프롬프트 0건.
