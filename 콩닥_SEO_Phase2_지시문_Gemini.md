# 콩닥 SEO Phase 2 (High) — Gemini 지시문

Phase 1(홈 SSR·로케일 404)은 배포·검증 완료. 이번엔 audit High 4건. **절대 규칙:** 결제·궁합·인증 로직 변경 금지, SEO 관련만. `npm run build`+`tsc` 통과 → 커밋 → **배포 전 Cowork 프리체크** → `safe_deploy`.

## H1. 개인 궁합 결과 페이지 색인 차단 (개인정보 — 최우선)
**문제:** `/ko/compat/[id]` 결과 페이지가 색인 허용 상태 + 제목에 사람 이름/애칭이 들어감 → 공유 링크가 크롤링되면 **이름이 구글 검색에 노출**(AGENTS.md 개인정보 규칙 위반 소지).
**수정:** 이 라우트 메타데이터에 **noindex** 부여:
```ts
robots: { index: false, follow: true }
```
- `/ko/compat/[id]`의 `generateMetadata`(없으면 그 세그먼트에 `layout.tsx` 추가해서)에서 위 robots 설정.
- **OG/트위터 태그는 그대로 유지** — noindex여도 카카오/스레드 공유 미리보기는 정상 동작(언퍼러는 색인과 무관).
- `robots.ts`는 그대로(OG 언퍼를 위해 /compat 크롤 허용 유지). 색인만 메타로 차단.
- 확인: 배포 후 `curl -s https://kongdak.kr/ko/compat/<아무id> | grep -i noindex` 로 메타 존재.

## H2. `/ko/pricing` canonical 자기참조 + 사이트맵 포함
**문제:** pricing이 `lib/seo.ts` PAGE_META에 없어서 홈(`''`) 메타를 상속 → canonical이 홈을 가리켜 **pricing이 색인에서 빠짐**.
**수정:**
1. `lib/seo.ts` `PAGE_META`에 `'/pricing'` 추가(ko):
   - title: `요금 안내 — 심층 궁합 리포트 | 콩닥`
   - description: `콩닥 심층 궁합 리포트 가격 안내. 단건 결제와 기간 이용권으로 관계의 갈등 포인트와 연애 조언까지 확인하세요.`
2. `/ko/pricing` 라우트가 `createPageMetadata('/pricing')`(또는 `buildPageMetadata('/pricing', locale)`)를 쓰도록 연결 — 다른 라우트(guide 등)와 동일 패턴.
3. `app/sitemap.ts` `PUBLIC_ROUTES`에 `{ path: '/pricing', changeFrequency: 'monthly', priority: 0.7 }` 추가.
- 확인: `curl -s https://kongdak.kr/ko/pricing | grep canonical` 이 `/ko/pricing`을 가리키는지.

## H3. hreflang 신호 모순 제거
**문제:** next-intl이 응답에 en/ja/es/de/fr 대체언어(Link header/alternates)를 계속 알리는데, 그 페이지들 canonical은 전부 `/ko` → 신호 충돌로 구글이 혼란.
**수정:** `i18n/routing.ts`(next-intl `defineRouting`)에 **`alternateLinks: false`** 추가. (로케일 동면 상태라 ko 단일 신호로 통일. 나중에 로케일 되살릴 때 다시 켜기.)
- 확인: 배포 후 응답 헤더에 `Link: <...>; rel="alternate"; hreflang=...` 가 안 나오는지.

## H4. 마스코트 PNG 캐싱 (성능)
**문제:** `next.config.ts` headers()가 `/mascot`·`/icons`를 `no-store`로 묶어 **방문마다 1MB PNG 재다운로드**. 게다가 앱 설치 배너가 원본 PNG를 28px로 사용.
**수정:**
1. `next.config.ts`에서 `/mascot`·`/icons` 정적 자산의 `no-store` 제거 → 장기 캐시:
   `Cache-Control: public, max-age=31536000, immutable`
   (HTML·API의 no-store 정책은 건드리지 말 것 — 정적 이미지 경로만.)
2. 설치배너(InstallPWAButton 등)가 큰 원본 대신 `public/icons`의 작은 사이즈 아이콘(예: icon-192 축소본)을 쓰도록.
- 확인: `curl -sI https://kongdak.kr/mascot/<파일>.png | grep -i cache-control` 이 immutable 장기캐시인지.

## 검증·보고
- `tsc`+`npm run build` 통과, 변경 파일 목록 보고 → 커밋(푸시까지) → **배포 전 Cowork 프리체크** → `safe_deploy`(VERIFIED).
- Phase 3(루트 307→308, /compat/new 메타·og:image, "이번 주 운세" 링크)는 다음 차례.

## 참고 — 이전 FAQ+SearchAction 지시문 정정
- **SearchAction은 구현하지 말 것** (구글 sitelinks searchbox 2024.11 종료 — 효과 없음).
- FAQ는 **화면 본문 + JSON-LD 유지**(AI답변/AEO 목적). 단 "구글 리치결과" 기대는 제외(2026.5 종료).
