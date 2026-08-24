# 콩닥 Phase A — Opus5(터미널/Claude Code) 최종검수 인계

**용도:** 제미나이(안티그래비티)가 구현한 Phase A(바이럴 궁합 MVP)를 배포 전 최종 검수.
**사용법:** 아래 프롬프트를 Claude Code(Opus5) 터미널에 그대로 붙여넣는다. Opus5는 저장소 전체 접근 + 명령 실행이 되므로, 보고서를 믿지 말고 직접 빌드·테스트·코드로 검증하게 한다.

---

## 붙여넣는 프롬프트

```
너는 콩닥(kongdak) 프로젝트 Phase A의 최종 코드 검수자다. 이 저장소는 K-Destiny를 국내 사주 궁합 서비스로 개편 중이며, Phase A는 "바이럴 궁합 MVP"다. 제미나이(안티그래비티)가 구현했고, 너는 배포 전 마지막 게이트다.

[기준 문서]
- 저장소 루트 AGENTS.md 의 "절대 규칙"과 "보안" 섹션
- 콩닥_PhaseA_개발스펙.md (범위·산식·측정 정의)
- REVIEW_HANDOFF.md 는 참고만 하되 절대 곧이곧대로 믿지 마라. 모든 주장을 실제 코드·실행으로 검증하라.

[먼저 실행하라]
- npx tsc --noEmit / 린트 / npm run build / npx tsx scripts/test_compatibility.ts 를 직접 돌려 결과를 확인하라.
- lib/compatibility.ts 로 실제 계산을 몇 케이스 돌려보고(같은 입력 반복·A/B 순서 교환) 결과를 눈으로 확인하라.
- 무료/심층 AI 프롬프트로 실제 궁합 리딩을 2~3개 생성해 출력에 한자·사주 전문용어가 새는지 직접 확인하라(가능하면).

[중점 검증 항목 — 각 항목 PASS/FAIL + 파일:라인 + 근거]
1. 궁합 엔진 결정론: Math.random/Date 등 비결정 요소 부재. 같은 입력=같은 점수, calculateCompatibility(A,B)==(B,A) 순서 무관.
2. 점수 산식: 5축 가중(일간30/상보30/지지20/균형10/음양10) 실제 반영, rawTotal 33~100 → 60~99 매핑 정확(경계값). 테스트가 산식을 진짜 검증하는지(약한 테스트 아닌지) 비판적으로 보고, 부족하면 적대적 케이스를 추가하라.
3. 지지(地支) 관계 표: BRANCH_SIX_COMBO/THREE_COMBO/CLASH/PUNISH/HARM_ENMITY 5개 표가 명리학 정의와 일치하고 12지지(子丑寅卯辰巳午未申酉戌亥) 외 문자·의도치 않은 중복이 없는지 전수 확인(과거 '自由' 오타·丑未/寅申 충형중복 이력 있음).
4. 한자·전문용어 노출: 화면(components/*Compat*)·프롬프트·응답 어디에도 한자/오행/일간/천간/지지 등이 사용자에게 노출되지 않는지. destinyGen 의 DAY_MASTER_KOREAN_DESC·STRICT_NO_HANJA_RULE 실제 적용 확인.
5. K-loop(가장 중요): 공유 유입→내 궁합 생성 시 sourceCompatId 가 DB에 실제로 기록되는 경로를 처음부터 끝까지 추적하라. 결과페이지→/compat/new 링크의 ref 보존, /compat/new→CompatNewClient→POST /api/compat→where{shareToken:ref}→sourceCompatId 저장, compat_created 의 has_ref. ref를 떨어뜨리는 경로가 하나도 없는지 확인하고, 가능하면 통합 테스트를 추가하라.
6. 측정(GA4): me_created/compat_created/share_card_created/share_click/view_paywall 이벤트가 실제 발사 지점에 연결됐는지(trackEvent 호출부 grep), gtag 설정·측정ID 주입 방식 확인. 코드에 있는 것과 발사되는 것을 구분해 지적.
7. 프라이버시·보안: (a) GET /api/compat 및 결과페이지가 birthHash·fourPillars·elementsScore·dayMaster 등 생일 역산 가능한 필드를 클라이언트로 내보내지 않는지 (b) createBirthHash 가 .env pepper(BIRTH_HASH_PEPPER) 사용, 하드코딩 없음 (c) shareToken 이 암호학적 난수(≥128비트)이고 열거 불가 (d) 원본 생년월일이 로그(console)에 남지 않음 (e) 커밋에 시크릿(.env 등) 없음, get_creds/safe_deploy 규칙 준수.
8. 스코프 준수: 매칭·소개팅·본인인증·구독·결제 로직이 만들어지지 않았는지. en/ja 로케일·Gumroad 코드가 삭제 아닌 동면 상태인지. prisma 변경이 기존 테이블 파괴 없이 Compatibility 추가만인지(마이그레이션 additive).
9. Next.js 16 정합성: async params/searchParams await 처리, server/client 경계, OG 라우트 runtime(nodejs, prisma 사용) 적절성, OG 이미지 절대 URL·metadataBase, localStorage 등 금지 API 미사용, rate limiter 동작.
10. 엣지케이스·견고성: 태어난 시간 모름, 잘못된/미래 생년월일, 상대 정보 누락, AI 생성 실패 폴백, rate limit 초과 처리.

[출력 형식]
- 발견사항을 심각도(Blocker/High/Medium/Low)로 정렬. 각 항목: 파일:라인, 문제, 재현/근거, 수정안(가능하면 diff).
- Blocker/High 는 승인 전 수정 대상으로 명확히 표기. 네가 안전하게 고칠 수 있는 것은 고치고, 판단이 필요한 것은 제안만 하라.
- 마지막에 "배포 가능 여부(Go/No-Go)"와 그 근거를 한 문단으로.
- 범위 밖 기능을 새로 추가하지 마라. 리팩터는 결함 수정에 필요한 최소한만.
```

---

## 참고 — Cowork(전략 파트너)가 이미 프리체크로 확인한 것
아래는 이미 코드로 확인되어 통과했으니, Opus5는 재검증하되 새 결함 발굴에 집중:
- 궁합 엔진 결정론·산식(5축, 33→60/100→99 매핑)·A·B 순서 무관 — 통과
- 지지 표 '自由' 오타 교정(→子酉), 丑未·寅申 충형중복 제거 — 통과
- 한자 차단(DAY_MASTER_KOREAN_DESC + STRICT_NO_HANJA_RULE) — 통과(단, 실제 출력 샘플 검증 권장)
- shareToken 암호난수(base64url 24자), birthHash + .env pepper, GET 응답 PII 최소화 — 통과
- K-loop 전 구간 ref 보존(결과페이지·CTA→/compat/new→POST→sourceCompatId), has_ref true — 통과
- OG 절대 URL + metadataBase, 스코프 준수(결제·매칭·구독 미구현), 빌드/타입/테스트 PASS

## 검수 후
Opus5의 Blocker/High 결과가 나오면 타당성·수정 방향을 함께 판단한 뒤, 통과 시 배포·측정 세팅(환경변수·Vercel·kongdak.kr·GA4 DebugView 실발사·개인정보처리방침)으로 넘어간다.
