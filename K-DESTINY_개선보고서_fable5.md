# K-Destiny fable5 개선 보고서 — 2차 (2026-07-21)

1차에서 "다음 과제"로 남겼던 항목까지 전부 코드로 적용했습니다. 로컬 `k-destiny` 폴더에 저장 완료. 안티그래비티에서 `npx tsc --noEmit` 확인 후 커밋/푸시하면 됩니다.

---

## ⚠️ 최우선 리마인드 (1차 발견)

**Gumroad 웹훅 price 센트 버그** — Gumroad ping은 `price`를 센트("299"=$2.99)로 보내는데 달러로 파싱하고 있어 **실결제가 전부 무시되던 치명적 버그**. 수정 완료. 배포 후 $2.99 실결제 1건으로 반드시 엔드투엔드 확인.

## 1차 적용분 요약

- 웹훅: 센트 버그 수정, 시크릿+seller_id 검증, 환불 시 미부여, sale_id 멱등성
- 구독 만료 후 평생 프리미엄 버그 수정 (entitlement / JWT / generate-premium 3곳)
- generate-destiny·chat API의 userId/isPremium 스푸핑 취약점 → 서버 세션 기반으로 전환
- Pricing: 결제 후 자동 해금 폴링 + 성공 연출 + 자동 이동, 로그인 후 "결제 계속하기" 배너(구매 의도 복구), 전체 다국어화
- 결과 페이지: 폴링 누수 수정 + 해금 성공 필
- SajuDataGatekeeper 한국어 하드코딩 → 6개 언어
- 게스트→가입 시 사주 프로필 DB 자동 동기화
- GA4 컴포넌트(`components/Analytics.tsx`) + CSP 허용

## 2차 적용분 (이번 요청: "범위 밖 항목 + 디자인 전부 고치기")

### 기능·보안

- **mock 결과 캐시 금지** — AI 3개 모델이 모두 실패해 mock 리딩이 나갈 때, 서버 캐시와 localStorage 24h 캐시에 저장되어 유료 고객까지 하루 종일 가짜 리딩을 보던 문제. `fallback: true` 응답은 서버·클라이언트 어디에도 캐시하지 않고, 다음 방문 때 진짜 AI를 재시도.
- **레이트 리미터 Redis 전환** (`lib/rateLimiter.ts` 전면 개편) — 인메모리 Map은 서버리스에서 인스턴스마다 리셋되어 사실상 장식이었음. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 환경변수만 넣으면 **npm 패키지 설치 없이** Upstash REST API로 영속 카운팅. env 미설정/Upstash 장애 시 기존 인메모리로 자동 폴백이라 지금 당장 배포해도 안전. (Upstash 무료 티어: upstash.com → Redis DB 생성 → REST URL/TOKEN 복사)
- **게스트 채팅 서버 측 제한** — 비로그인 사용자는 IP당 **하루 3회**로 백스톱. localStorage를 지워가며 무제한으로 Gemini를 태우던 구멍 차단. 초과 시 "무료 상담 소진 — 무료 계정을 만들어 계속하세요" 403 응답(가입 유도 겸용).
- **Gumroad 구독 라이프사이클 처리** (웹훅 v4) — 같은 URL 하나로 JSON resource 이벤트까지 처리:
  - `refund`/`dispute` → **접근권 회수** (단건: 해당 sale의 PurchasedReport 삭제, 구독: FREE 강등)
  - `cancellation` → 상태만 CANCELLED (만료일까지 이용 유지 — 표준 SaaS 관행)
  - `subscription_ended` → FREE + EXPIRED
  - `subscription_restarted` → 재활성화 + 기간 연장
  - 등록 방법: Gumroad API로 리소스별 1회 등록 →
    `curl -X PUT "https://api.gumroad.com/v2/resource_subscriptions?access_token=<토큰>&resource_name=refund&post_url=https://thekdestiny.com/api/webhooks/gumroad?secret=<시크릿>"` (resource_name을 refund / cancellation / subscription_ended / subscription_restarted 로 바꿔 4번 실행)
- **GA4 퍼널 이벤트 계측** (`lib/gtag.ts` 신규) — `unlock_click`(페이월 클릭) → `begin_checkout`(Gumroad 탭 오픈) → `purchase_confirmed`(웹훅 확인) 3단계를 결과/가격 페이지 양쪽에 심음. GA만 켜면 바로 전환 퍼널이 보임.

### 디자인

- **결과 페이지 페이월 재설계** — 잠긴 4개 섹션 전부에 붙어 있던 동일한 대형 CTA를 **첫 번째 카드 1개에만** 유지. 나머지 3개는 짧은 프리뷰 + "위 결제 한 번으로 함께 해금됩니다" 한 줄의 조용한 잠금 카드(클릭하면 동일하게 결제 오픈, 6개 언어). 장사꾼 느낌과 스크롤 피로 감소, 모바일에서 특히 깔끔.
- **연간 플랜 가격 프레이밍** — $4.17/mo 아래 "☕ 커피 한 잔 값도 안 되는 한 달" 한 줄 추가(6개 언어).
- 유지 결정: 로딩 연출과 결과 첫 화면의 사주 명식표 순서는 현행 유지(신뢰 형성에 유리).

### 의도적으로 유지한 것 1건

**단건 구매와 리포트의 1:1 미연결** — 오푸스 검수 체크리스트 1번에 "의도된 관대함"으로 명시된 설계라 유지했습니다. 조이면(사주 리셋 시 프로필 id가 바뀌는 구조상) 정당한 구매자가 잠기는 환불 리스크가 생깁니다. 악용 정황이 보이면 웹훅의 `reportId` 저장값과 entitlement 비교 한 줄로 언제든 조일 수 있습니다.

### 남은 수동 확인 1건

**모바일 실기기 점검** — 코드는 375px 기준으로 손봤지만, 실제 아이폰/갤럭시에서 사주 명식표(SajuChart)와 가격 카드를 한 번 훑어보세요. (샌드박스에서는 실기기 테스트 불가)

---

## 배포 전 환경변수 (전체)

```
# 필수 — 웹훅 위조 방지
GUMROAD_WEBHOOK_SECRET=<긴 랜덤 문자열>   # ping/resource URL에 ?secret=<값> 포함해 등록
GUMROAD_SELLER_ID=<Gumroad seller_id>

# 강력 권장 — 레이트 리미터 영속화 (없으면 인메모리 폴백)
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=<토큰>

# 강력 권장 — 애널리틱스 (없으면 GA 미로드)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## 검증 체크리스트 (안티그래비티)

1. `npx tsc --noEmit` → exit 0
2. env 4종 설정 + Gumroad ping URL에 `?secret=` 반영 + resource 4종 등록(위 curl)
3. $2.99 실결제 → 결과 페이지 자동 해금 + 성공 필 확인 → Gumroad에서 환불 → 접근권 회수 확인
4. 시크릿 없이 웹훅 POST → 401 확인
5. 게스트로 채팅 4회 → 4회째 403 확인

---

# 📊 GA4 속성 만들기 + 설정 상세 가이드

## 1단계 — GA4 속성 생성 (5분)

1. https://analytics.google.com 접속 → 구글 계정(gmoseo2026@gmail.com)으로 로그인
2. 좌측 하단 톱니바퀴 **관리(Admin)** → **+ 만들기 → 속성(Property)**
3. 속성 이름: `K-Destiny`, 보고 시간대: **미국(또는 주 타겟 시장)** ← 글로벌 서비스면 UTC 권장, 통화: USD
4. 비즈니스 정보 대충 선택(소규모/온라인 판매) → 만들기
5. **데이터 스트림 → 웹** 선택 → URL: `https://thekdestiny.com`, 스트림 이름: `K-Destiny Web` → 만들기
6. 생성된 스트림 화면 우측 상단의 **측정 ID `G-XXXXXXXXXX`를 복사** ← 이게 전부입니다. 코드 스니펫은 붙일 필요 없음(이미 `Analytics.tsx`가 처리)

## 2단계 — 서비스에 연결 (1분)

Vercel(또는 서버) 환경변수에 추가 후 재배포:

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

- Vercel: 프로젝트 → Settings → Environment Variables → 추가 → Redeploy
- 로컬 `.env.local`에도 같은 줄 추가하면 로컬에서도 수집(개발 중엔 빼는 걸 권장)

확인법: 배포된 사이트 접속 → GA4 좌측 **보고서 → 실시간** → 본인 접속이 1명으로 잡히면 성공. (광고 차단기 켜져 있으면 안 잡히니 시크릿 창 + 차단기 끄고 확인)

## 3단계 — 이번에 심어둔 커스텀 이벤트 확인

코드가 자동으로 보내는 이벤트 (별도 설정 없이 수집됨):

| 이벤트 | 의미 | 파라미터 |
|---|---|---|
| `unlock_click` | 페이월/플랜 버튼 클릭 | source(result/pricing), product |
| `begin_checkout` | Gumroad 결제창 오픈 | source, product |
| `purchase_confirmed` | 웹훅으로 결제 확정 | source, product |

- 수집 확인: **관리 → 데이터 표시 → DebugView** 또는 실시간 보고서의 이벤트 카드
- 24~48시간 후 **보고서 → 참여도 → 이벤트**에 집계됨

## 4단계 — 전환(키 이벤트) 지정 (2분, 중요)

1. **관리 → 데이터 표시 → 이벤트** 로 이동
2. `purchase_confirmed`와 `begin_checkout`이 목록에 나타나면(첫 발생 후) 오른쪽 토글로 **키 이벤트(Key event)로 표시**
3. 이제 모든 표준 보고서에서 "전환"으로 집계되고, 유입 채널별 전환(예: TikTok 유입의 결제율)을 볼 수 있게 됨

## 5단계 — 매주 볼 화면 딱 2개

- **보고서 → 실시간**: 숏폼 올린 직후 유입 확인용
- **탐색(Explore) → 유입경로 탐색(Funnel exploration)**: 새 퍼널 만들기 → 단계 추가:
  1. `page_view` (페이지 경로 `/result` 포함)
  2. `unlock_click`
  3. `begin_checkout`
  4. `purchase_confirmed`
  → 이 4단계 이탈률이 앞으로 모든 개선 판단의 기준입니다. 예: 1→2 이탈이 크면 페이월 카피 문제, 3→4 이탈이 크면 Gumroad 결제창/가격 문제.

## 6단계 — 유입 출처 태깅 (숏폼 운영 시 필수)

TikTok/릴스/쇼츠 프로필 링크에 UTM을 붙이세요:

```
https://thekdestiny.com/ko?utm_source=tiktok&utm_medium=social&utm_campaign=saju_shorts
```

→ GA4 **보고서 → 획득 → 트래픽 획득**에서 채널별 방문·전환이 자동 분리됩니다. 플랫폼별로 utm_source만 바꾸면 됩니다(instagram / youtube / threads).

## 자주 걸리는 함정

- 측정 ID는 `G-`로 시작(GA4). `UA-`로 시작하면 옛날 속성을 잘못 만든 것 — 삭제하고 다시.
- `NEXT_PUBLIC_` 접두사 필수 — 이게 없으면 클라이언트 번들에 값이 안 들어가서 GA가 안 뜹니다.
- 본인 접속 제외: 관리 → 데이터 스트림 → 태그 설정 → 내부 트래픽 정의에 집 IP 등록 후 데이터 필터 활성화(선택).
- EU 트래픽이 커지면 쿠키 동의 배너 필요 — 초기엔 `anonymize_ip`(이미 켜둠)로 시작하고, 유럽 매출이 유의미해지면 CMP 도입.
