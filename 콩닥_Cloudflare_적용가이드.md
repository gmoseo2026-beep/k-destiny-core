# 콩닥(kongdak.kr) Cloudflare 적용 가이드 — 비개발자용 클릭 순서

**목표:** 배포 전에 kongdak.kr을 Cloudflare 뒤에 넣어 원본 서버 IP를 숨기고, DDoS·봇 차단 + CDN 캐싱 + 엣지 SSL을 얹는다.
**현재 상태(실측):** kongdak.kr → **161.97.134.176(Contabo 서버 직결)**, nginx + SSL(HSTS/CSP/X-Frame-Options)까지 적용됨. Cloudflare만 없음. (트립각/thekdestiny.com은 이미 Cloudflare 뒤에 있음.)
**소요:** 계정 만들고 설정 15~20분 + 네임서버 전파 대기(보통 10분~수 시간). 대기 중에도 사이트는 계속 열림.

> ⚠️ 딱 하나만 주의: SSL 모드는 반드시 **Full (strict)** 로. `Flexible`로 두면 무한 리다이렉트로 사이트가 안 열립니다. (아래 6단계)

---

## 준비물
- kongdak.kr을 **구매한 등록기관 로그인 정보** (가비아 / 후이즈 / 카페24 / 아사달 등 — 형이 산 곳).
- Cloudflare 가입용 이메일.

---

## 1단계 — Cloudflare 계정 만들기
1. https://dash.cloudflare.com/sign-up 접속 → 이메일/비밀번호로 가입 (무료 플랜).
2. 이메일 인증 완료 후 로그인.

## 2단계 — 사이트 추가
1. 대시보드에서 **Add a site**(사이트 추가) 클릭.
2. `kongdak.kr` 입력 → Continue.
3. 플랜 선택 화면에서 **Free($0)** 선택 → Continue.

## 3단계 — DNS 레코드 확인 (중요)
Cloudflare가 기존 DNS를 자동으로 스캔해 보여줍니다. 아래를 확인하세요.
1. **A 레코드**: 이름 `kongdak.kr`(또는 `@`), 값 `161.97.134.176` 이 있어야 함.
   - 없으면 **Add record**로 직접 추가: Type=A, Name=`@`, IPv4=`161.97.134.176`.
   - 오른쪽 **구름 아이콘(Proxy status)은 반드시 주황색(Proxied)** 으로. 회색(DNS only)이면 Cloudflare를 안 거칩니다.
2. **www** 를 쓸 거면: Type=A, Name=`www`, IPv4=`161.97.134.176`, 주황색 구름. (안 쓰면 생략)
3. 나중에 이메일(help@kongdak.kr 등)을 붙일 계획이면 MX/TXT 레코드는 그때 추가 — 지금은 없어도 됩니다.
4. **Continue** 클릭.

## 4단계 — Cloudflare 네임서버 2개 받아 적기
화면에 이런 형태의 네임서버 2개가 나옵니다(예시, 실제 값은 각자 다름):
```
xxxx.ns.cloudflare.com
yyyy.ns.cloudflare.com
```
→ 이 **두 개를 메모장에 복사**해 두세요. 다음 단계에서 등록기관에 넣습니다.

## 5단계 — 가비아(Gabia)에서 네임서버 변경  ★ 형은 가비아에서 구매

> ⚠️ **순서 주의:** 반드시 3단계(Cloudflare에 A레코드 `@`→161.97.134.176, 주황 구름)를 먼저 끝낸 뒤에 네임서버를 바꾸세요. 그래야 전환 중에도 사이트가 안 끊깁니다.

1. **가비아 로그인** → 우측 상단 **My가비아**(마이가비아) 클릭.
2. **서비스 관리 → 도메인**(또는 "도메인 통합관리") 으로 이동.
3. 목록에서 **kongdak.kr** 체크 → **관리** 버튼(또는 도메인 옆 "관리툴") 클릭.
4. 관리 화면에서 **"네임서버 설정"**(또는 "네임서버/DNS 설정") 메뉴 클릭.
5. 네임서버 사용 방식에서 **"타 기관 네임서버 사용"(직접 입력)** 을 선택.
6. **1차 네임서버 / 2차 네임서버** 칸에 4단계에서 받은 Cloudflare 네임서버 2개를 각각 입력:
   - 1차: `xxxx.ns.cloudflare.com`
   - 2차: `yyyy.ns.cloudflare.com`
   - ※ 가비아가 **IP 주소 칸**을 같이 요구하면 **비워 두세요**(Cloudflare 호스트명은 자동으로 조회됩니다). 3차·4차 칸도 비워 둡니다.
7. **적용/확인** 클릭해서 저장.

저장하면 Cloudflare가 자동으로 전환을 감지합니다(보통 수 분~수 시간, .kr은 대개 빠름). 감지되면 Cloudflare 대시보드가 **Active**로 바뀌고 안내 메일이 옵니다.

*(참고 — 다른 등록기관일 경우: 후이즈=도메인 관리→"네임서버/DNS 관리", 카페24=도메인→"네임서버 변경", 아사달=도메인 관리→"네임서버 관리".)*

## 6단계 — SSL 모드 설정 (⚠️ 가장 중요)
Cloudflare 대시보드 → kongdak.kr 선택 → 좌측 **SSL/TLS** → **Overview**.
- 암호화 모드를 **Full (strict)** 로 설정.
  - 이유: 우리 서버에 이미 유효한 Let's Encrypt 인증서가 있어서 strict가 가장 안전합니다.
  - 만약 strict에서 오류가 나면 일시적으로 **Full**(strict 아님)로 두고, 인증서 상태 확인 후 다시 strict로.
- **절대 Flexible 금지** (무한 리다이렉트 발생).

이어서 **SSL/TLS → Edge Certificates**:
- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON

## 7단계 — 콩닥(소비자 바이럴 서비스)에 맞는 안전 설정
좌측 메뉴에서 아래만 확인/조정하세요. 나머지는 기본값 그대로 둡니다.
1. **Security → Bots → Bot Fight Mode: OFF**
   - 켜면 카카오톡 인앱 브라우저나 일반 사용자를 봇으로 오인해 막을 수 있습니다. 바이럴 서비스엔 끄는 게 안전.
2. **Speed → Optimization → Rocket Loader: OFF**
   - 켜면 Next.js 화면이 깨질 수 있습니다.
3. **Caching**: 기본값 유지. (Cloudflare는 기본적으로 `/api` 같은 동적 경로를 캐시하지 않으므로 궁합 계산·OG 이미지·로그인에 지장 없음.)
   - (선택, 나중에) 공유 카드 속도를 더 올리고 싶으면 `/api/og/*` 전용 캐시 규칙을 추가할 수 있음 — 지금은 불필요.

## 8단계 — 전환 확인
Cloudflare에서 도메인이 **Active** 로 바뀐 뒤:
- https://kongdak.kr 접속 → 정상 오픈되면 성공.
- (형이 원하면 제가 서버 헤더를 다시 찍어서 `Server: cloudflare` 로 바뀌었는지, 원본 IP가 가려졌는지 확인해 드립니다.)

---

## 그다음 순서 (배포)
1. Cloudflare Active 확인 → 제가 헤더로 재검증.
2. 콩닥 Phase A 최종 검수(Opus5) 통과.
3. `scripts/safe_deploy.py` 배포.
4. **배포 직후 Cloudflare에서 캐시 비우기**: Caching → Configuration → **Purge Everything** (새 버전이 바로 보이도록).
5. https://kongdak.kr 실측: 국문 랜딩·궁합 플로우·카톡 공유 카드·소셜 로그인·GA DebugView.

## 참고 — 자주 하는 걱정
- **Let's Encrypt 자동갱신 깨지나?** 아니요. Cloudflare가 `/.well-known/acme-challenge` 요청을 원본으로 그대로 넘겨서 갱신은 계속 정상 동작합니다.
- **소셜 로그인(카카오/네이버/구글) 영향?** 없음. 리다이렉트 URL(kongdak.kr)이 그대로라 콜백도 그대로 동작. (단 Bot Fight Mode는 위처럼 OFF 권장.)
- **전환 중 사이트 다운?** 없음. 네임서버가 완전히 바뀌기 전까지 기존 경로로도 계속 열립니다.
