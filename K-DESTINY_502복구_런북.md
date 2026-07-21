# K-Destiny 502 복구 런북 + 성능 진단 (2026-07-21)

## 0. 지금 상황을 정확히 읽기

- **사이트는 오리진 서버가 죽어서 502** 입니다 (Cloudflare "Host Error"). 방금 재확인했고 여전히 502입니다.
- **PageSpeed 점수는 진짜 사이트가 아니라 Cloudflare 에러 페이지를 측정한 것**입니다. 성능 100 = 텅 빈 에러 페이지라서 나온 숫자이고, SEO 45·접근성 68도 에러 페이지 기준입니다. **이 점수들로 오푸스의 성능 작업을 평가하면 안 됩니다.** 서버를 살린 뒤 다시 측정해야 진짜 점수가 나옵니다.
- 오푸스의 코드 자체를 git 커밋에서 복원해 전수 검토했습니다: 스트리밍 생성, 모델 체인 재정렬(2.0-flash 우선), AVIF 이미지, font display:swap, 이미지 경량화, karma 일일 리필 등 — **방향은 전부 옳고, 제 이전 수정(웹훅/보안/결제 플로우)도 보존되어 있습니다.** 문제는 코드가 아니라 배포 과정일 가능성이 큽니다.

## 1. 유력한 사망 원인 (중요도순)

1. **DB 마이그레이션 누락** — 이번 커밋에 `User.karmaResetAt` 컬럼이 추가됐습니다(`prisma/schema.prisma`). 서버에서 `prisma db push`를 안 돌렸다면: (a) 빌드 시 `prisma generate`가 안 돌았으면 타입 에러로 **빌드 실패**, (b) 빌드는 됐어도 로그인 사용자의 모든 요청(entitlement/chat)이 DB 에러.
2. **빌드 실패 후 프로세스 사망** — 배포 스크립트가 `.next`를 지우고 빌드하다 실패하면 `next start`가 즉시 종료 → pm2 크래시 루프 → 502.
3. **빌드 중 메모리 부족(OOM)** — 작은 VPS에서 next build가 죽는 흔한 케이스.

## 2. 복구 절차 (안티그래비티에서 서버 접속 후, 위에서부터 순서대로)

```bash
# ① 무엇이 죽었는지 확인 — 이 로그의 마지막 에러가 진범입니다
pm2 list && pm2 logs --lines 120
# (pm2가 아니면: systemctl status <서비스명> / docker ps + docker logs)

# ② DB 마이그레이션 + 클라이언트 재생성 (이번 배포의 필수 단계)
cd <프로젝트 경로>
npx prisma db push
npx prisma generate

# ③ 클린 빌드 — 여기서 에러가 나면 그 메시지를 저에게 보여주세요
rm -rf .next
npm run build
# 메모리 부족(Killed)이면:
# NODE_OPTIONS="--max-old-space-size=2048" npm run build
# 그래도 안 되면 로컬(안티그래비티)에서 빌드해서 .next를 서버로 업로드

# ④ 재시작 + 로컬 확인
pm2 restart all --update-env
curl -I http://localhost:3000/en    # HTTP 200 나오면 서버 정상

# ⑤ Cloudflare 캐시 퍼지
# 대시보드 → Caching → Configuration → Purge Everything
```

④에서 200이 나오는 순간 502는 끝납니다. 그 다음 PageSpeed를 다시 돌리세요 — 그게 진짜 점수입니다.

## 3. 이번에 추가로 고쳐둔 것 (로컬 파일에 반영 완료 → 함께 커밋하세요)

- **`lib/karma.ts` 배포 안전장치** — `karmaResetAt` 컬럼이 아직 DB에 없어도 앱이 500으로 죽지 않고 구버전 동작으로 자동 강등되도록 try/catch 폴백 추가. **`prisma db push`를 깜빡해도 사이트는 살아있게** 만드는 보험입니다. (그래도 ②는 꼭 실행하세요 — 안 하면 프리미엄 일일 20회 리필이 비활성입니다)
- **SEO: 언어별 title/meta description** (`app/[locale]/layout.tsx`) — 지금까지 6개 언어 전부 영어 메타를 쓰고 있었습니다. ko/ja/es/de/fr 각각 현지어 title+description으로 교체. OG/트위터 카드도 동일 적용. 한국·일본 검색 노출/클릭률에 직접 효과.
- **접근성**: 언어 선택 셀렉트에 aria-label, 로그인 모달 닫기 버튼에 aria-label(+장식 아이콘 aria-hidden), Pricing 페이지 저대비 텍스트(gray-600/700 → gray-400/500) 상향. 접근성 점수 68의 실제 감점 요인들입니다.
- 오푸스의 성능 개선(AVIF+31일 이미지 캐시, font display:swap, prefers-reduced-motion, 스트리밍 무료 리딩 + 잠금 섹션 지연 생성, 모델 체인 재정렬, 이미지 경량화)은 그대로 유지.

## 4. 서버가 살아난 뒤 확인 체크리스트

1. `/en` 200 + 첫 화면 정상 렌더
2. 로그인 → 결과 페이지: 명식표가 먼저 뜨고 무료 리딩이 타이핑되듯 스트리밍되는지
3. 채팅 1회: 카르마 숫자가 서버 기준으로 표시/차감되는지 (프리미엄이면 20/20)
4. `npx prisma db push`를 돌렸는지 재확인 (안 돌리면 서버 로그에 [Karma] degrading 경고가 계속 찍힘)
5. PageSpeed 재측정 (모바일) — 이제부터가 진짜 기준선. 이 시점 점수를 기록해 두세요.

## 5. 참고: 이 502가 남긴 교훈 (재발 방지)

- **스키마 변경이 포함된 배포는 항상**: `db push → generate → build → 빌드 성공 확인 → restart` 순서. 빌드 실패 시 이전 `.next`를 남겨두는 배포 스크립트(예: 새 빌드는 임시 폴더에서 하고 성공 시 교체)로 바꾸면 실패해도 사이트가 죽지 않습니다.
- 배포 직후 `curl -I localhost:3000` 한 줄을 배포 스크립트 마지막에 넣어두면 "죽은 채로 방치"가 사라집니다.
- Cloudflare → Notifications에서 Origin Error Rate 알림을 켜두면 다음번엔 몇 분 안에 알 수 있습니다.
