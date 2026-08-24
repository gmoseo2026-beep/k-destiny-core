# 콩닥 Phase A — Opus5 최종 검수 프롬프트 (배포 직전)

아래 블록을 Claude Code(Opus5) 터미널에 그대로 붙여넣으세요.

```
너는 콩닥(kongdak) 프로젝트 Phase A의 최종 코드 검수자다. K-Destiny를 국내 사주 궁합(무료 바이럴 MVP)으로 개편했고, 너는 배포 전 마지막 게이트다. 제미나이(안티그래비티)가 구현했고 Cowork(전략/프리체크 파트너)가 1차 프리체크를 통과시킨 상태다. 보고서를 믿지 말고 모든 주장을 실제 코드·실행으로 검증하라.

[기준 문서]
- 저장소 루트 AGENTS.md 의 "절대 규칙"·"보안" 섹션
- 콩닥_PhaseA_개발스펙.md (범위·산식·측정 정의)
- 콩닥_약관_개인정보_초안.md (확정본 v3 — 약관/개인정보 페이지의 정답지)
- REVIEW_HANDOFF.md 는 참고만, 곧이곧대로 믿지 마라.

[먼저 직접 실행하라]
- npx tsc --noEmit / 린트 / npm run build / npx tsx scripts/test_compatibility.ts 를 직접 돌려 결과 확인.
- lib/compatibility.ts 로 실제 계산 몇 케이스(같은 입력 반복·A/B 순서 교환) 눈으로 확인.
- 가능하면 무료/심층 AI 궁합 리딩 2~3개 생성해 출력에 한자·사주 전문용어가 새는지 확인.

[중점 검증 — 각 항목 PASS/FAIL + 파일:라인 + 근거]
1. 궁합 엔진 결정론: Math.random/Date 등 비결정 요소 부재. 같은 입력=같은 점수, calculateCompatibility(A,B)==(B,A).
2. 점수 산식: 5축 가중(일간30/상보30/지지20/균형10/음양10), rawTotal 33~100 → 60~99 매핑 경계값 정확. 테스트가 약한 테스트면 적대적 케이스 추가.
3. 지지(地支) 관계표 5종(육합/삼합/충/형/해원진)이 명리 정의와 일치, 12지지 외 문자·의도치 않은 중복 없는지 전수 확인(과거 '自由' 오타·丑未/寅申 충형중복 이력).
4. 한자·전문용어 노출: 화면·프롬프트·응답 어디에도 한자/오행/일간/천간/지지가 사용자에게 노출 안 되는지. STRICT_NO_HANJA_RULE 실제 적용 확인.
5. K-loop(가장 중요): 공유 유입→내 궁합 생성 시 sourceCompatId 가 DB에 실제 기록되는 경로를 끝까지 추적. 결과페이지→/compat/new ref 보존→POST /api/compat→where{shareToken:ref}→sourceCompatId 저장, compat_created 의 has_ref. ref 떨어뜨리는 경로가 없는지, 가능하면 통합테스트 추가.
6. 측정(GA4): me_created/compat_created/share_card_created/share_click/view_paywall 등 이벤트가 실제 발사 지점에 연결됐는지(trackEvent 호출부 grep), 측정ID 주입 방식 확인. "코드에 있음"과 "실제 발사됨"을 구분.
7. 프라이버시·보안: (a) GET /api/compat·결과페이지가 birthHash·fourPillars·elementsScore·dayMaster 등 생일 역산 필드를 클라이언트로 내보내지 않는지 (b) createBirthHash 가 .env pepper(BIRTH_HASH_PEPPER) 사용, 하드코딩 없음 (c) shareToken 암호난수(≥128비트)·열거 불가 (d) 원본 생년월일이 로그에 안 남는지 (e) 커밋에 시크릿(.env 등) 없음, get_creds/safe_deploy 규칙 준수.
8. 스코프 준수: 매칭·소개팅·본인인증·구독·결제 로직 미구현. en/ja 등 로케일·Gumroad 코드가 삭제 아닌 동면. prisma 변경이 기존 테이블 파괴 없이 additive 인지.
9. Next.js 정합성: async params/searchParams await, server/client 경계, OG 라우트 runtime(nodejs)·절대 URL·metadataBase, localStorage 등 금지 API 미사용, rate limiter 동작.
10. 엣지케이스: 태어난 시간 모름/잘못된·미래 생년월일/상대 정보 누락/AI 생성 실패 폴백/rate limit 초과.

[이번에 추가된 부분 — 반드시 함께 검증]
11. 약관/개인정보 페이지: messages/ko.json "Legal" + app/[locale]/terms/page.tsx + privacy/page.tsx 가 콩닥_약관_개인정보_초안.md(v3)와 1:1 일치하는지. 약관 11조·개인정보 11항 전부 존재, 시행일 2026-09-01, 운영사 "디아이컴퍼니", 면책(제3조) 강조 섹션 유지, 개인정보 보호책임자=역할명+help@kongdak.kr(실명·전화 없음).
12. 위탁·국외이전: privacy 페이지에 6개 수탁자(Supabase/Contabo/Cloudflare/Google Gemini/Google Analytics/소셜) + 소재 국가 표가 실제 렌더되는지. 국외이전 문구(항목·국가·목적·보유기간) 누락 없는지.
13. Footer(components/Footer.tsx): 하단 법적 고지가 콩닥 한국어 기준이고, 옛 "K-Destiny"·"all sales are final"·"non-refundable" 영문/무조건환불불가 문구가 완전히 제거됐는지. 약관 제9조(청약철회)와 모순 없는지. terms/privacy 링크·help@kongdak.kr 정상.
14. 마스코트(components/KongdakMascot.tsx + 배치): next/image 사용, useReducedMotion 으로 prefers-reduced-motion 시 애니메이션 정지, size별 256/512 분기, width/height 지정으로 CLS 방지. 배치(KongdakHero·CompatResultClient 로딩/점수·CompatNewClient)가 기존 기능·가독성 저해 없는지, 이미지 최적화 적절한지.
15. 사업자정보 노출 시점: 사업자등록번호·대표자·주소 등은 결제(9/1) 시점에 노출 예정이다. 현재 무료 단계에서 이런 사업자 상세가 페이지·리포지토리에 의도치 않게 노출/커밋돼 있지 않은지 확인.

[Cowork 가 이미 프리체크로 통과시킨 것 — 재검증하되 새 결함 발굴에 집중]
- 약관 11조/개인정보 11항 텍스트가 초안 v3와 일치, 위탁 6개사 표 렌더, 보호책임자 역할명, 시행일 9/1, 디아이컴퍼니 — 통과
- Footer 하단 고지 한국어 교체·옛 영문/무조건환불 제거 — 통과
- 마스코트 컴포넌트(next/image·prefers-reduced-motion) 및 4개 배치 — 통과
- 타 로케일(en/de/es/fr/ja.json) 미변경 — 파일 mtime 으로 확인, 통과
(단, Cowork 는 샌드박스라 npm run build 를 직접 재실행하지 못했다. 빌드·타입·테스트는 네가 반드시 직접 돌려 확정하라.)

[출력 형식]
- 발견사항을 심각도(Blocker/High/Medium/Low)로 정렬. 각 항목: 파일:라인, 문제, 재현/근거, 수정안(가능하면 diff).
- Blocker/High 는 승인 전 수정 대상으로 명확히 표기. 안전하게 고칠 수 있는 건 고치고, 판단 필요한 건 제안만.
- 마지막에 "배포 가능 여부(Go/No-Go)"와 근거 한 문단.
- 범위 밖 기능 새로 추가 금지. 리팩터는 결함 수정에 필요한 최소한만. en/ja 등 다른 로케일 파일 건드리지 마라.
```
