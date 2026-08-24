# 콩닥 — K-Destiny 브랜드 잔재 전면 제거 (Opus5 최종 마무리)

아래를 Claude Code(Opus5) 터미널에 붙여넣는다. 저장소 전체 grep·수정·삭제·재빌드가 필요한 작업이라 Opus5가 수행한다.

**이미 완료된 것(건드리지 마라):** `app/favicon.ico`, `public/og-image.jpg` 는 콩닥 브랜드로 이미 교체됨.

```
너는 콩닥(kongdak) 프로젝트에서 옛 K-Destiny 브랜드 잔재를 전 저장소에서 완전히 제거하는 작업을 한다. 목표: 사용자·크롤러가 어디서도 "K-Destiny / 우주 도사 / 운명 설계도" 느낌을 못 찾게 만든다. Phase A 콩닥은 "사주 기반 궁합" 서비스다.

[콩닥 Phase A 실제 표면(살릴 것)]
- 랜딩 '/', 궁합 입력 '/compat/new', 결과 '/compat/[id]', '/guide', '/terms', '/privacy', 로그인/AuthModal, (로그인 시)대시보드.
- 브랜드 톤: 사주 궁합·두근거림·친근. 컬러 coral #FF5C77 / plum #6A2C70 / gold #FFC24B / cream #FFF6F1.

[1단계 — 전수 조사]
저장소 전체(node_modules/.next 제외)에서 아래 패턴을 grep 해 목록화하라:
  grep -rniE "k-?destiny|thekdestiny|cosmic|우주|운명|도사|에너지 싱크|에너지 동기화|카르마|블루프린트|blueprint|마스터 선택|select-master|input-destiny|우주적|영혼|주파수" app components lib messages public --include=*.ts --include=*.tsx --include=*.json --include=*.md
각 히트를 "사용자 도달 가능 여부"로 분류하라.

[2단계 — 메타데이터/SEO (lib/seo.ts)]
- 모든 라우트 title 의 "| K-Destiny" → "| 콩닥", 영문/국문 cosmic 설명을 콩닥 사주궁합 톤으로 교체. (예 landing: "콩닥 — 우리, 얼마나 잘 맞을까? 사주 궁합")
- twitter `creator: '@thekdestiny'` → 제거하거나 콩닥 공식 핸들(없으면 삭제).
- 옛 K-Destiny 전용 라우트(/input-destiny, /pricing, /sync, /select-master 등)의 메타 항목은 해당 페이지를 삭제하면 함께 제거, 유지한다면 콩닥 톤으로.

[3단계 — sitemap/robots (app/sitemap.ts, app/robots.ts)]
- sitemap PUBLIC_ROUTES 를 콩닥 실제 라우트만으로 교체: '', '/compat/new'(또는 실제 궁합 진입 경로), '/guide', '/terms', '/privacy'. 죽은 라우트(/input-destiny,/pricing,/sync,/select-master) 제거.
- robots 는 유지하되 죽은 private 경로 정리(선택).

[4단계 — 죽은 K-Destiny 라우트·컴포넌트·에셋 삭제]
콩닥 Phase A 에서 쓰지 않는 K-Destiny 전용 자산을 제거(git rm). 대상 예시(존재하는 것만):
- 라우트/페이지: app/[locale]/{pricing,sync,select-master,blueprint,input-destiny,daily,chat,onboarding} (해당 페이지가 콩닥과 무관하면 삭제). 삭제 시 링크·import 깨지지 않게 참조부도 정리.
- 컴포넌트: 오직 위 페이지에서만 쓰이는 컴포넌트(SajuChart 등 마스터/블루프린트 전용) — 사용처 없으면 제거.
- 이미지: public/images/ 의 master_*, element_*, remedy_* (옛 도사·오행 이미지). 콩닥에서 참조 0이면 전부 삭제.
- 삭제가 위험하면(공용 참조 존재) 삭제 대신 라우트를 noindex + '/'로 redirect 하고 K-Destiny 문구만 제거. 무엇을 지웠고 무엇을 남겼는지 보고.

[5단계 — 문구(messages/ko.json)]
- 살아있는 콩닥 화면에서 쓰는 키의 우주·운명·에너지·도사 문구를 콩닥 사주궁합 톤으로 교체.
- 삭제한 페이지의 네임스페이스(SelectMaster, Blueprint, Pricing, Sync, Premium, InputDestiny, Chat, Index(옛 히어로) 등)는 키째 삭제. 단 삭제 전 어느 컴포넌트도 그 키를 참조하지 않는지 grep 로 확인.
- en/de/es/fr/ja.json 등 동면 로케일 텍스트 파일은 건드리지 마라(i18n 폴백이 ko 를 덮으므로 ko 만 정리하면 됨).

[6단계 — 기타]
- package.json name, README.md, GEMINI.md, CLAUDE.md, manifest.json 등에 남은 K-Destiny 표기 정리(사용자 비노출 내부 문서는 우선순위 낮음, 단 manifest.json 은 사용자 노출이니 콩닥 확인).
- layout.tsx 의 JSON-LD·메타가 콩닥/디아이컴퍼니로 일관되는지 확인(이미 콩닥이면 유지).

[하지 말 것]
- app/favicon.ico, public/og-image.jpg 는 이미 콩닥으로 교체됨 — 덮어쓰지 마라.
- 궁합 엔진(lib/compatibility.ts)·K-loop·결제 로직 손대지 마라.
- 동면 로케일 JSON 텍스트 수정 금지.

[완료 기준]
- 1단계 grep 재실행 시, 사용자 도달 가능한 코드/문구에서 K-Destiny·우주·운명·도사 잔재 0.
- npm run build 통과, 타입 에러 0, 죽은 import/링크 없음.
- 브라우저 탭 제목이 모든 페이지에서 "…| 콩닥"(K-Destiny 없음), sitemap 에 콩닥 라우트만.
- 지운 파일/라우트 목록과 남긴 것(및 이유)을 요약 보고.
```
