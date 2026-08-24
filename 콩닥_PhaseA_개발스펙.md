# 콩닥 — Phase A 개발 스펙 (바이럴 궁합 MVP)

**작성:** 2026-08-14 · **개정:** 2026-08-20(v1.1) · **목표:** K-Destiny 코드베이스를 재활용해 **콩닥**의 첫 검증 제품(바이럴 궁합)을 배포하고, **바이럴 계수 K**를 측정한다.
**원칙:** 매칭·구독은 아직 만들지 않는다(Phase B/C). Phase A는 "무료 궁합이 여성 사이에서 퍼지는가"만 증명한다. 안 되면 여기서 값싸게 멈춘다.

> **개정 이력 v1.1 (2026-08-20):** **단건 결제(심층 궁합)를 Phase A 범위에서 공식 제외**한다. Phase A의 유일한 합격 기준은 **바이럴 계수 K**이며, 결제·매출은 K가 검증된 뒤 Phase A.5에서 붙인다. 이유: Phase A의 목적은 "바이럴이 도는가"의 검증이지 매출이 아니며, 결제를 게이트에 넣으면 (a)PG·통신판매업 준비가 검증을 지연시키고 (b)유입이 적은 검증 초기에 결제 0건이 K와 무관하게 판정을 흐린다. 결과 화면의 "심층 궁합" 버튼은 관심도 측정용 티저(`view_paywall`)로만 두고 결제 연동은 하지 않는다.

---

## 0. Phase A 범위 (딱 이만큼)

**만든다:** ① 콩닥 리브랜딩 ② 궁합 입력(내/상대) ③ 궁합 결과 + AI 해석 ④ **공유 카드/OG(K팩터 핵심)** ⑤ 측정(GA4) ⑥ 심층 궁합 **티저만**(결제 연동 없음, 관심도 측정용)
**안 만든다(다음 단계):** **단건 결제(→Phase A.5)**, 관계망 저장·AI 코칭·구독(B), 매칭·소개팅·본인인증(C), 커머스·트립각 딥링크(B 후반). ※ '내 사주(/me)' 단독 화면은 Phase A에서 제외 — 진입은 궁합 입력으로 직행.

**완료 기준(Gate) — 배포 후 4주, K 단일 기준:**
- **1차(핵심): 바이럴 계수 `K = compat_created(has_ref=true) ÷ share_created` ≥ 0.5** (→1 지향).
- 보조 지표(참고용, 게이트 아님): `share_created / compat_created ≥ 40%`(공유 전환), 무료 리딩 완료율, 재유입율.
- **판정:** K ≥ 0.5 → 다계정 확산·Phase A.5(결제) 착수 / K < 0.5 → 공유카드·후크 1주 재설계 반복 / 누적 방문 충분한데도 K가 안 오르면 컨셉 재검토.
- ~~심층 결제 발생 ≥ 1~~ → **Phase A.5로 이동(v1.1에서 게이트에서 제외).**

---

## 1. 기술 스택 — 재활용 vs 신규

| 영역 | 재활용(그대로) | 신규/수정 |
|---|---|---|
| 프레임워크 | Next.js 15, Supabase, Prisma, next-intl | ko 로케일 주력, en/ja 동면 |
| 사주 엔진 | `lib/saju.ts`(만세력), `lib/trueSolarTime.ts` | **궁합 계산 모듈 신규**(`lib/compatibility.ts`) |
| AI 해석 | `lib/destinyGen.ts`(Gemini, STYLE_GUIDE) | 궁합 프롬프트 추가 |
| 콘텐츠 IP | `SajuContentDictionary` | 궁합 카테고리 시드 추가 |
| 결제 | (Gumroad 동면) | **토스페이먼츠/카카오페이 단건** 신규 |
| 이미지 | — | **OG 공유카드 생성**(`@vercel/og`/satori) 신규 |
| 측정 | `lib/gtag.ts` | 이벤트 5종 등록·발사 |

---

## 2. 화면 플로우 (모바일 우선)

```
(1) 랜딩  /ko
    히어로: "우리, 잘 맞을까?" + [내 생년월일 입력] 즉시 노출(1클릭)
        ↓ (로그인·마스터선택 없음. 가치 먼저)
(2) 내 사주 요약  /ko/me
    일간·성향·오행 3줄 (AI 스트리밍, saju.ts→destinyGen)
    CTA: [궁합 보기]
        ↓
(3) 궁합 입력  /ko/compat/new
    상대 생년월일(+선택: 이름/관계유형: 연인·썸·친구)
    [상대에게 링크 보내 함께 보기] or [내가 상대 정보 입력]
        ↓
(4) 궁합 결과  /ko/compat/[id]
    점수(0-100, 크게) + 키워드 3개 + AI 해석(무료: 요약 3문단)
    [공유 카드 만들기]  [심층 궁합 9,900원]
        ↓
(5) 공유 카드  /ko/compat/[id]/card
    OG 이미지 자동 생성 → 인스타/카톡 공유. 카드에 브랜드+CTA
        ↓ (받은 사람이 링크 클릭 → (1)로 유입 = K루프)
(6) 심층 궁합(결제)  /ko/compat/[id]/premium
    결제 → 상세 리포트(관계 흐름·조심할 점·좋은 시기·연애 팁)
```

퍼널 원칙: **로그인은 (4) 이후로 이연**(공유·저장·결제 시점에만). 첫 화면 이탈 89%였던 구조를 2클릭 이내로.

---

## 3. 궁합 계산 알고리즘 (`lib/compatibility.ts` 신규)

입력: 두 사람의 `SajuResult`(기존 `calculateFourPillars` 재사용).

**결정론적 점수(0–100)** = 가중 합:
1. **일간 관계(30점)** — 두 일간(천간)의 관계: 합(合)=만점, 생(生)=높음, 비화(比)=중, 극(剋)=낮음. 천간합(갑기·을경…) 보너스.
2. **오행 상보성(30점)** — 한쪽 결핍 오행을 상대가 채우는가(상생 보완). 서로의 `elementsScore` 벡터 상보도.
3. **지지 관계(20점)** — 일지(日支) 삼합·육합=가점, 충(沖)·형(刑)·해(害)=감점.
4. **오행 균형(10점)** — 두 명식 합산 오행이 고르게 분포할수록 가점.
5. **음양 조화(10점)** — 음양 치우침 보정.

→ 원점수 정규화 후 **60~99 구간에 매핑**(사용자 만족·공유 유도상 40점 미만은 지양, 단 로직상 낮으면 "노력형" 서사로 처리). **키워드 3개**는 점수 구성에서 파생(예: 오행 상보 최고 → "물과 나무", 일간합 → "천생연분", 충 → "밀당 케미").

**AI 서사(destinyGen 확장)**: 위 결정론적 결과를 프롬프트에 주입(계산 금지, 해석만). 무료=요약 3문단, 심층=상세. STYLE_GUIDE 그대로(한자·전문용어 금지, 다정한 톤).

> 원칙: 점수·키워드는 **결정론(재현성)**, 문장만 AI. 같은 커플은 항상 같은 점수 → 신뢰·공유 유발.

---

## 4. DB 스키마 변경 (`prisma/schema.prisma`)

```prisma
model Compatibility {
  id          String   @id @default(cuid())
  // 입력(비회원도 가능: userId nullable)
  userId      String?
  personA     Json     // {name?, birth, time?, gender} → 해시 저장 권장
  personB     Json
  relation    String   @default("love") // love | crush | friend
  // 결과(결정론)
  score       Int
  keywords    String[] // 3개
  breakdown   Json     // 5축 원점수
  // AI 해석 캐시
  summaryKo   String?  @db.Text
  premiumKo   String?  @db.Text
  isPaid      Boolean  @default(false)
  // 바이럴 추적
  shareToken  String   @unique   // 공유 링크용
  sourceCompatId String?          // 어느 카드에서 유입됐는지(K 측정)
  createdAt   DateTime @default(now())
}
```

- 기존 `UserSajuProfile`·`User`·`DailyFortune`는 유지. 
- `PurchasedReport`를 심층궁합 결제 기록에 재사용(또는 `Compatibility.isPaid`).
- 비회원 궁합 허용(userId null) → 진입장벽 최소화, 결제·저장 시 로그인.

---

## 5. 공유 카드 / OG (K팩터 핵심)

- **`app/api/og/compat/route.tsx`** (`@vercel/og` 또는 satori): 점수·이름·키워드·콩닥 브랜드를 브랜드보드 그라디언트(#FF8AA1→#FF5C77→#6A2C70)로 렌더.
- 결과 페이지 `generateMetadata()`에 OG 태그 → 카톡/인스타 링크 미리보기가 곧 카드.
- 다운로드용 카드(1080×1350, 인스타 스토리) 별도 생성 버튼.
- 카드 하단 고정: **"내 궁합도 30초면 → kongdak.kr"** + `shareToken` UTM.
- **모든 공유 링크에 `?ref=<shareToken>`** → 유입 시 `sourceCompatId` 기록 → **K 계산 근거**.

---

## 6. 측정 (`lib/gtag.ts`) — 배포 전 필수

GA4 주요 이벤트 등록 + DebugView 실발사 확인:
`me_created`(내 사주), `compat_created`, `share_card_created`, `share_click`(유입), `view_paywall`, `purchase_confirmed`.

**K 계산:** `신규 compat_created(ref 있음) ÷ 직전 코호트 share_card_created`. 주간 대시보드로 추적.

---

## 7. 국내 결제 (심층 궁합 단건 9,900원)

- **토스페이먼츠 또는 카카오페이 단건 결제** 연동(위험업종 회피 위해 "서비스료 단건", 포인트충전 금지).
- 결제 성공 웹훅 → `Compatibility.isPaid=true` → 심층 리포트 해금(결제 즉시 생성 = 심사 유리).
- 푸터에 사업자정보·통신판매업번호·환불정책 노출(PG 심사 통과 요건). 환불: "심층 리포트 열람 전 100% 환불".
- Gumroad는 글로벌 동면 유지(코드 삭제 X).

---

## 8. 리브랜딩 적용 (콩닥)

- 브랜드 변수화: 로고(브랜드보드 SVG), 컬러 토큰(코랄/플럼/골드/크림/잉크), Pretendard.
- 카피: "우리, 잘 맞을까?" / 다정한 톤 / `오락·자기이해 목적` 고지 유지.
- ko 로케일 주력, en/ja 메시지·라우트는 남기되 비노출(동면).
- 도메인: **kongdak.kr**(메인) 연결. (kongdak.app 확보 시 앱 대비.)

---

## 9. 구현 순서 (스텝)

1. **측정·법무 먼저**: GA4 이벤트 6종 + DebugView, 푸터 사업자·약관·환불, 통신판매업 신고 착수.
2. **결제 연동**: 토스/카카오 단건(테스트→실결제 1회 검증·환불).
3. **궁합 엔진**: `lib/compatibility.ts` + 단위테스트(같은 입력=같은 점수).
4. **AI 해석**: destinyGen 궁합 프롬프트(무료/심층 분기).
5. **화면**: 랜딩(1클릭)→내사주→궁합입력→결과→(결제).
6. **공유카드/OG**: `@vercel/og` 라우트 + shareToken/ref 루프.
7. **리브랜딩**: 콩닥 컬러·로고·카피·도메인.
8. **배포**(Vercel) + 네이버 서치어드바이저/GA 연결 → 스레드/인스타 궁합 후크로 오가닉 유통 시작.

---

## 10. Phase A 이후 (예고)

- **Phase A.5**: K ≥ 0.5 검증 후 **단건 결제(심층 궁합 9,900원)** 붙이기 — 국내 PG/간편결제 + 통신판매업 신고 + 환불정책 + 사업자 푸터. (Phase A에서 이연된 항목)
- **Phase B**: 관계망 저장 + AI 관계 코칭 + **월 구독**(리텐션) + 트립각 커플여행·개운 굿즈 크로스.
- **Phase C**: (여성 유동성 확보 시) **매칭·소개팅** + 본인인증. — 콩닥의 상방.

---

### 참고 — 재사용 코드 매핑
`lib/saju.ts`(명식) · `lib/trueSolarTime.ts`(정통성) · `lib/destinyGen.ts`(AI·STYLE_GUIDE) · `SajuContentDictionary`(IP) · `lib/gtag.ts`(측정) · `lib/rateLimiter.ts` · `lib/seo.ts` · `prisma/schema.prisma`(확장).
신규: `lib/compatibility.ts` · `app/api/og/compat/route.tsx` · `app/[locale]/compat/*`. (결제 라우트는 Phase A.5)
