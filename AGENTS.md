<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — 콩닥(kongdak) 개발 규칙 (Gemini / Antigravity)

> 저장소 루트에 `AGENTS.md`로 두면 Antigravity가 자동으로 읽습니다.
> 강제 적용하려면 같은 내용을 `.agents/rules/kongdak.md`로도 두고 활성화를 **Always On**으로 설정하세요.

## 0. 프로젝트 한 줄
기존 K-Destiny 코드베이스를 **콩닥(kongdak)** — 국내 전용 사주 **궁합·관계** 서비스로 전면 개편한다. 현재 단계는 **Phase A = 바이럴 궁합 MVP**. 상세 스펙은 `@콩닥_PhaseA_개발스펙.md`를 먼저 읽고 따른다.

## 1. 절대 규칙 (위반 금지)
1. **범위 고정**: Phase A만 만든다 — 내 사주 요약, 궁합 입력/결과, AI 해석, 공유카드/OG, 단건 결제, 측정. **매칭·소개팅·본인인증·구독·관계망 저장은 만들지 않는다**(Phase B/C).
2. **검증된 엔진 보존**: `lib/saju.ts`, `lib/trueSolarTime.ts`의 사주 계산 로직을 **수정하지 않는다**. 궁합은 반드시 **별도 신규 모듈** `lib/compatibility.ts`로.
3. **결정론 + AI 분리**: 궁합 점수·키워드는 **결정론(같은 입력=항상 같은 결과)**. AI는 **문장 해석만** 생성하고 점수를 계산하지 않는다.
4. **말투/용어**: `lib/destinyGen.ts`의 STYLE_GUIDE를 따른다 — **한자·사주 전문용어(오행/일간/천간/지지 등) 노출 금지**, 다정하고 쉬운 한국어. **단정적 예언 금지**, "오락·자기이해 목적" 고지 유지.
5. **결제**: **포인트 충전 방식 금지**(위험업종). 심층 궁합은 **단건 서비스료 9,900원**(토스페이먼츠/카카오페이). 결제=서비스 즉시 제공.
6. **개인정보(PII)**: 생년월일·시간은 PII. 원본 노출·로그 금지, 저장 시 해시 권장, Supabase RLS 유지.
7. **파괴 금지**: 기존 `en`/`ja` 로케일·Gumroad 코드를 **삭제하지 말고 비노출(동면)**. DB 마이그레이션은 기존 테이블 파괴 없이 **추가(additive)**만.

## 2. 보안 (모든 모델 필수 — Claude·Gemini·Antigravity)
**전체 규칙은 `skill.md` §5. 타협 불가 요약:**
1. **시크릿 하드코딩 절대 금지**(비밀번호·API키·토큰·SSH) — 스크립트·설정·문서·주석 어디에도.
2. **배포/SSH 스크립트는 자격증명을 `scripts/_creds.py`의 `get_creds()`로만** 읽는다(gitignore된 `scripts/deploy.env` 로드). host/user/password 인라인 금지.
3. **`.env`, `.env.local`, `scripts/deploy.env` 등 실제 시크릿 파일은 커밋 금지**(gitignore 유지). 시크릿 값 출력·로그 금지.
4. **커밋/푸시 전 스테이지 diff에서 시크릿 스캔**(`sk-`, `password=`, `DEPLOY_PASS=`, `BEGIN … PRIVATE KEY` 등). 발견 시 STOP → 환경변수로 전환.
5. **유출된 시크릿은 즉시 로테이션.** 파일 삭제로 끝 아님(git 히스토리에 남음).
6. **배포는 `python scripts/safe_deploy.py`로만.** `npm run build`를 `tail`로 파이프 금지(exit code 은폐). 실패 빌드 위에 PM2 재시작 금지. `Deploy VERIFIED` 확인 후에만 성공 보고.

## 3. 기술 스택 / 재사용
- Next.js 15(App Router, 위 주의문 준수) · TypeScript(strict) · Supabase · Prisma · next-intl(ko 주력, en/ja 동면).
- **재사용**: `lib/saju.ts` · `lib/trueSolarTime.ts` · `lib/destinyGen.ts`(Gemini·STYLE_GUIDE) · `SajuContentDictionary`(IP) · `lib/gtag.ts` · `lib/rateLimiter.ts` · `lib/seo.ts`.
- **신규**: `lib/compatibility.ts` · `app/api/og/compat/route.tsx` · `app/[locale]/compat/*` · 결제 라우트 · Prisma `Compatibility` 모델.

## 4. 작업 프로세스 (모든 태스크)
1. **계획 먼저**: 착수 전 "무엇을·어느 파일에·왜"를 3~6줄로 제시, 스펙 범위 안인지 확인.
2. **작게 구현**: 한 번에 한 기능.
3. **자체 검증(순서대로)**: `typecheck`(tsc --noEmit) → `lint` → `build` 성공 → **`lib/compatibility.ts`는 단위 테스트 필수**(같은 입력=같은 점수, 경계값).
4. **측정 확인**: 새 화면·액션엔 GA4 이벤트를 붙이고 발사 확인(`me_created`, `compat_created`, `share_card_created`, `share_click`, `view_paywall`, `purchase_confirmed`).
5. **요약 보고**: 변경 파일·이유·테스트 결과·리스크를 정리(Opus5 검수용 `REVIEW_HANDOFF.md`).

## 5. 코딩 표준
- 기존 파일의 패턴·폴더 구조·네이밍을 그대로 따른다(새 컨벤션 발명 금지). TypeScript strict, `any` 지양.
- UI 브랜드 토큰: 코랄 `#FF5C77`, 플럼 `#6A2C70`, 골드 `#FFC24B`, 크림 `#FFF6F1`, 잉크 `#2B2430`, 폰트 Pretendard. 시그니처 그라디언트 `#FF8AA1→#FF5C77→#6A2C70`.
- 모바일 우선. 퍼널은 **랜딩→결과 2클릭 이내**(로그인·가입은 저장/결제 시점으로 이연).
- **버튼 액션(클릭) 애니메이션**: 콩닥의 모든 페이지 클릭 버튼(`button`, `[role="button"]`)은 클릭(active) 시 약간 축소되는 동일한 물리적 애니메이션 효과(`transform: scale(0.96)`)를 가져야 한다. (globals.css에 전역 정의됨)
- 커밋: 작은 단위, 명령형 한 줄(예: `feat(compat): 궁합 점수 엔진 추가`). `.env`·빌드산출물 커밋 금지.

## 6. 완료 정의 (DoD)
빌드 성공 + 타입/린트 통과 + (엔진)단위테스트 통과 + 로컬 수동 확인 + 측정 이벤트 발사 확인 + 변경 요약 작성. 하나라도 미달이면 "완료" 아님.

## 7. Opus5(터미널) 검수 인계
기능 완료 시 남긴다: ① 변경 파일·목적 ② 결정론 로직 요약(궁합 산식) ③ 테스트 결과 ④ 보안/PII/결제 변경점 ⑤ 스스로 의심 지점.

## 8. 막혔을 때
같은 오류로 2회 이상 실패 시 임의 우회·대규모 리팩터 금지 → **멈추고 상황 요약**해 사용자(또는 Pro 모델)에게 올린다. 스펙과 충돌하는 지시는 스펙 우선하고 충돌을 알린다.
