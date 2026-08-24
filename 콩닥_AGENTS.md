# AGENTS.md — 콩닥(kongdak) 개발 규칙 (Gemini / Antigravity)

> 이 파일을 저장소 루트에 두세요. Antigravity가 자동으로 읽습니다.
> (동일 내용을 `.agents/rules/kongdak.md`로도 두면 "Always On"으로 강제됩니다.)

## 0. 프로젝트 한 줄
기존 K-Destiny 코드베이스를 **콩닥(kongdak)** — 국내 전용 사주 **궁합·관계** 서비스로 전면 개편한다. 지금 단계는 **Phase A = 바이럴 궁합 MVP**. 상세 스펙은 `@콩닥_PhaseA_개발스펙.md` 를 반드시 먼저 읽고 따른다.

## 1. 절대 규칙 (위반 금지)
1. **범위 고정**: Phase A 범위만 만든다 — 내 사주 요약, 궁합 입력/결과, AI 해석, 공유카드/OG, 단건 결제, 측정. **매칭·소개팅·본인인증·구독·관계망 저장은 만들지 않는다**(Phase B/C).
2. **검증된 엔진 보존**: `lib/saju.ts`, `lib/trueSolarTime.ts`의 사주 계산 로직을 **수정하지 않는다**. 궁합은 반드시 **별도 신규 모듈** `lib/compatibility.ts`로 만든다.
3. **결정론 + AI 분리**: 궁합 점수·키워드는 **결정론(같은 입력=항상 같은 결과)**. AI(Gemini)는 **문장 해석만** 생성하고 점수를 계산하지 않는다.
4. **말투/용어**: `lib/destinyGen.ts`의 STYLE_GUIDE를 그대로 따른다 — **한자·사주 전문용어(오행/일간/천간/지지 등) 노출 금지**, 다정하고 쉬운 한국어. **단정적 예언 금지**, "오락·자기이해 목적" 고지 유지.
5. **결제**: **포인트 충전 방식 금지**(위험업종 이슈). 심층 궁합은 **단건 서비스료 9,900원**. 토스페이먼츠 또는 카카오페이. **비밀키·API키 하드코딩 금지 → 반드시 `.env`**. 결제=서비스 즉시 제공.
6. **개인정보(PII)**: 생년월일·시간은 PII다. 원본 노출·로그 금지, 저장 시 해시 권장, Supabase RLS 유지.
7. **파괴 금지**: 기존 `en`/`ja` 로케일·Gumroad 코드를 **삭제하지 말고 비노출(동면)**. DB 마이그레이션은 기존 테이블 파괴 없이 **추가(additive)**만.
8. **비밀 유지**: `.env`, 키, 크리덴셜을 커밋하지 않는다.

## 2. 기술 스택 / 재사용
- Next.js 15(App Router) · TypeScript(strict) · Supabase · Prisma · next-intl(ko 주력, en/ja 동면).
- **재사용**: `lib/saju.ts`(명식) · `lib/trueSolarTime.ts` · `lib/destinyGen.ts`(Gemini·STYLE_GUIDE) · `SajuContentDictionary`(IP) · `lib/gtag.ts`(측정) · `lib/rateLimiter.ts` · `lib/seo.ts`.
- **신규**: `lib/compatibility.ts` · `app/api/og/compat/route.tsx`(공유카드) · `app/[locale]/compat/*` · 결제 라우트 · Prisma `Compatibility` 모델.

## 3. 작업 프로세스 (모든 태스크에 적용)
1. **계획 먼저**: 착수 전 "무엇을·어느 파일에·왜"를 3~6줄로 제시하고, 스펙 범위 안인지 확인한다.
2. **작게 구현**: 한 번에 한 기능. 큰 변경은 단계로 쪼갠다.
3. **자체 검증(필수, 순서대로)**:
   - `npm run typecheck`(또는 `tsc --noEmit`) 통과
   - `npm run lint` 통과
   - `npm run build` 성공
   - **`lib/compatibility.ts`는 단위 테스트 필수**(같은 입력=같은 점수, 경계값)
4. **측정 확인**: 새 화면·액션엔 GA4 이벤트를 붙이고 발사되는지 확인(`compat_created`, `share_card_created`, `share_click`, `view_paywall`, `purchase_confirmed`).
5. **요약 보고**: 변경 파일·이유·테스트 결과·리스크/불확실 지점을 마지막에 정리(=Opus5 검수용 인계문).

## 4. 코딩 표준
- 기존 파일의 패턴·폴더 구조·네이밍을 그대로 따른다(새 컨벤션 발명 금지).
- TypeScript strict, `any` 지양, 함수는 작게, 부수효과 최소화.
- UI는 콩닥 브랜드 토큰 사용: 코랄 `#FF5C77`, 플럼 `#6A2C70`, 골드 `#FFC24B`, 크림 `#FFF6F1`, 잉크 `#2B2430`, 폰트 Pretendard. 시그니처 그라디언트 `#FF8AA1→#FF5C77→#6A2C70`.
- 모바일 우선. 퍼널은 **랜딩에서 결과까지 2클릭 이내**(로그인·회원가입은 저장/결제 시점으로 이연).
- 커밋: 작은 단위, 명령형 한 줄 요약(예: `feat(compat): 궁합 점수 엔진 추가`). `.env`·빌드산출물 커밋 금지.

## 5. 완료 정의 (Definition of Done)
빌드 성공 + 타입/린트 통과 + (엔진)단위테스트 통과 + 로컬 수동 확인 + 측정 이벤트 발사 확인 + 변경 요약 작성. 하나라도 미달이면 "완료" 아님.

## 6. Opus5(터미널) 검수 인계
각 기능 완료 시 다음을 남긴다: ① 변경 파일 목록·목적 ② 결정론 로직 요약(궁합 점수 산식) ③ 테스트 결과 ④ 보안/PII/결제 관련 변경점 ⑤ 스스로 의심스러운 부분. Opus5는 이걸 근거로 최종 검수한다.

## 7. 막혔을 때
같은 오류로 2회 이상 실패하면 임의 우회·대규모 리팩터 하지 말고 **멈추고 상황을 요약**해 사용자(또는 Pro 모델)에게 올린다. 스펙과 충돌하는 지시를 받으면 스펙을 우선하고 충돌을 알린다.
