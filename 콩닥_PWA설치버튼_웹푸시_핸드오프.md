# 콩닥 PWA 설치 버튼 + 웹 푸시(마케팅용) — Gemini 핸드오프 (3.1 Pro 권장)

**절대 규칙:** 궁합 엔진·K-loop·기존 결제/로그인 손대지 말 것. 동면 로케일 JSON 금지(ko.json만). prisma는 additive(기존 테이블 파괴 금지). 완료 시 `npm run build` 통과. 시크릿 커밋 금지(VAPID 개인키는 .env).

---

## Part 1 — PWA 설치 버튼 (홈 화면에 추가)
지금 PWA는 되지만 설치 유도가 주소창 옆 힌트뿐이라 안 보인다. **눈에 띄는 콩닥 버튼**으로 만든다.

1. `beforeinstallprompt` 이벤트를 캡처해 보관(preventDefault) → 커스텀 버튼/배너를 노출.
   - 컴포넌트 예: `components/InstallPWAButton.tsx`.
   - 버튼 클릭 시 저장해둔 이벤트의 `.prompt()` 호출, 결과(`accepted`/`dismissed`) 처리, 이벤트 소진 후 버튼 숨김.
2. **이미 설치된 경우 숨김**: `window.matchMedia('(display-mode: standalone)')` 또는 `navigator.standalone`(iOS) 참이면 버튼 미표시. `appinstalled` 이벤트 후에도 숨김.
3. **iOS Safari 대응**: iOS는 `beforeinstallprompt`가 없다 → iOS로 감지되면 버튼 클릭 시 "공유 → 홈 화면에 추가" 안내 모달(콩닥 톤, 스크린샷/아이콘)로 대체.
4. **배치**: 랜딩/결과 화면에 잘 보이는 위치(예: 히어로 CTA 근처 또는 상단 얇은 배너 "📲 콩닥 홈 화면에 추가"). 콩닥 라이트 톤 + 콩닥이 아이콘. 닫기(dismiss) 가능하고, 닫으면 일정 기간(예: localStorage로 7일) 재노출 안 함.
5. manifest.json 확인: name "콩닥", display standalone, start_url `/ko`, theme_color #FF5C77, 아이콘(192/512, maskable) 정상인지 점검(이미 돼 있으면 유지).

## Part 2 — 웹 푸시 (마케팅 전용, 재방문 유도)
바탕화면에 설치(또는 알림 허용)한 사람에게 마케팅 푸시를 보내 **무료 이용자·단건결제자를 다시 데려온다. 활성 구독자에겐 보내지 않는다.**

### 2-A. 준비 (VAPID)
- `web-push` 라이브러리 사용. VAPID 키 생성 → `.env`에 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`(mailto:help@kongdak.kr). 공개키는 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`로도 노출(구독 시 필요).

### 2-B. 서비스워커 (public/sw.js)
- `push` 이벤트: payload(title, body, url, icon) 파싱 → `self.registration.showNotification`.
- `notificationclick` 이벤트: 알림 클릭 시 해당 url(기본 kongdak.kr)로 이동(clients.openWindow/focus).
- 아이콘은 콩닥 아이콘(/icons/icon-192.png), 뱃지 지정.

### 2-C. 구독 흐름 (클라이언트)
- 설치 후(또는 명시적 "알림 받기" 버튼)에서 `Notification.requestPermission()` → 허용 시 `registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: <공개키> })`.
- 구독 객체(endpoint, keys.p256dh, keys.auth)를 `POST /api/push/subscribe`로 전송. 로그인 상태면 userId도 함께.
- **동의 UX**: 무료 핵심 루프를 방해하지 않게, 결과 확인 후/설치 후 시점에 부드럽게 요청(강제 X).

### 2-D. 저장 (Prisma, additive)
- `PushSubscription` 모델 추가: `id`, `endpoint`(unique), `p256dh`, `auth`, `userId`(nullable, 로그인 시 연결), `createdAt`. (무로그인 구독은 userId null = 기본 무료로 간주)
- 마이그레이션은 additive만.

### 2-E. 발송 & 세그먼트 (마케팅)
- `POST /api/push/send` (관리자 전용, role ADMIN) 또는 `scripts/send_push.ts`: 제목·내용·링크를 받아 대상에게 web-push 발송. 만료(410/404) 구독은 정리(삭제).
- **세그먼트(중요):** **활성 구독자(User.tier === 'PREMIUM' 이고 미만료) 제외.** 나머지(무료 = userId null 또는 tier FREE) 전원에게 발송.
  - ※ "단건결제자만 타깃" 같은 정밀 세그먼트는 **결제 시스템이 생긴 뒤** 연결한다(지금은 결제 데이터가 없음). 지금은 "활성 구독자 제외" 규칙까지만 구현하고, 단건결제 플래그 자리는 주석으로 표시.
- (선택) 관리자 화면에 간단 발송 폼(제목/내용/링크/대상 미리보기 수).

### 2-F. 동의·개인정보
- 개인정보처리방침에 "푸시 알림 수신을 위한 기기 토큰(구독 정보) 수집·마케팅 활용" 항목 추가(ko.json Legal). 알림 권한 = 동의로 간주하되 방침에 명시.

## 하지 말 것
- 무료 궁합/공유(K-loop) 흐름·엔진·기존 결제 로직 변경 금지.
- 푸시 강제/도배 금지 — 명시적 권한 + 구독자 제외.
- 타 로케일 JSON 수정 금지.

## 완료 기준
- 설치 버튼: 안드로이드/크롬에서 눈에 띄는 버튼 → 클릭 시 설치 프롬프트, iOS는 안내 모달, 이미 설치 시 숨김.
- 웹 푸시: 구독 저장 → 관리자/스크립트로 테스트 발송 → 알림 수신·클릭 시 kongdak.kr 이동. **활성 구독자 제외** 동작.
- prisma additive, `npm run build` 통과, 시크릿 커밋 없음. 변경/신규 파일 + 발송 사용법 요약 보고.

---

## (참고) 확정된 유료 가격 — 다음 유료 개발 때 반영
- 건별 심층 리포트 **2,900원**, **첫 결제 1,900원**, 구독 **9,900원/월**.
