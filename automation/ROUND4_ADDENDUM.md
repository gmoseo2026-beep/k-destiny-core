# Round 4 보강 지시서 (Phase 0.5 반영) — `ROUND4_ANTIGRAVITY.md` 와 함께 적용

> 개발총괄(Opus5) · 2026-07-26
> Phase 0.5 실측이 완료되어 **R4의 일부 전제가 바뀌었습니다.** 이 문서를 R4와 **함께** 적용하세요.
> 충돌하는 항목은 **이 문서가 우선**입니다. **모든 응답 한글.**

---

## A. 【치명·신규】 `Veo 3.1 - Lite [Lower Priority]` 는 **사용할 수 없습니다**

F8에 기록된 실제 에러 메시지:

> "죄송합니다. 현재 설정된 비디오 모델을 사용할 수 없는 상태입니다. 대신 Omni Flash 또는
> Veo 3.1 - Lite 모델을 사용하여 영상을 생성해 드릴 수 있습니다. 어떤 모델로 진행할까요?"
> **(Lite Lower Priority 선택 시 발생)**

R4 §2.1에서 기본 모델을 `"Veo 3.1 - Lite [Lower Priority]"` 로 지정했는데, **그 모델은 선택해도 생성이 실패합니다.**

### 수정

```python
    # Phase 0.5 실측(2026-07-26):
    #  - "Veo 3.1 - Lite [Lower Priority]" 는 목록에 있으나 선택 시 생성 실패(F8).
    #  - "Veo 3.1 - Lite" 실단가 = 정확히 10 크레딧 (25010 → 25000, 1회 생성).
    MODEL_LABEL = os.environ.get("FLOW_MODEL", "Veo 3.1 - Lite")
    MODEL_FORBIDDEN = ["Quality", "Lower Priority"]   # 선택되면 안 되는 것들
```

- **`Lower Priority` 도 금지 목록에 넣습니다.** 실패하는 모델로 밤새 헛돌지 않게.
- `Omni Flash` 는 Veo 계열이 아니므로 역시 선택 금지 대상입니다. `MODEL_FORBIDDEN` 에 `"Omni Flash"` 도 추가하세요.

### 크레딧 재계산 (확정)

| 항목 | 값 |
|---|---|
| `Veo 3.1 - Lite` 실단가 | **10 크레딧 / 생성 1회** (실측 확정) |
| 영상 1편 = 씬 3개 | **30 크레딧** |
| 하루 2편 | 60 크레딧 |
| 월(30일) | **1,800 크레딧** — 자체 상한 4,000의 **45%** |

`credits.CREDITS_PER_GENERATION = 10` 유지. 실측과 일치합니다.

---

## B. 【치명·신규】 Flow는 **에이전트 채팅** 기반입니다 — 에러 처리를 전면 재작성

F8이 드러낸 사실: **에러가 토스트가 아니라 "우측 에이전트 채팅 패널의 AI 응답 메시지"로 옵니다.**
그리고 단순 통보가 아니라 **"어떤 모델로 진행할까요?" 라고 되묻고 대기**합니다.

### 왜 치명적인가

1. 현재 `error_toast` 셀렉터는 `[role="alert"]`, `[aria-live="assertive"]` 기반입니다.
   **채팅 메시지는 여기에 절대 걸리지 않습니다.**
2. 에이전트가 질문을 던지고 멈춰 있으면, 자동화는 "생성 중"으로 오해하고
   **30분 타임아웃까지 그대로 매달립니다.** 밤새 1편도 못 만들고 끝납니다.
3. 최악은 에이전트가 **임의로 다른 모델로 진행**하는 경우입니다.
   `Veo 3.1 - Quality` 로 바뀌면 생성당 **100 크레딧** — 하룻밤에 예산이 증발합니다.

### 수정 요구사항

**1) 셀렉터 신설 — 에이전트 채팅 메시지**

```python
        # 에이전트 채팅 패널의 AI 응답 (F8 실측: 에러가 여기로 온다)
        "agent_message": [
            '[data-role="assistant"]',
            '[class*="assistant" i]',
            '[class*="agent-message" i]',
            '[class*="chat"] [class*="message"]',
        ],
        # 에이전트가 되묻는 상황(질문형) — 감지 즉시 중단해야 함
        "agent_blocking_question": [
            'text=/어떤 모델로 진행할까요/',
            'text=/사용할 수 없는 상태/',
            'text=/Which model would you like/i',
            'text=/is currently unavailable/i',
            'text=/instead/i',
        ],
```

**2) `wait_new_result()` 안에서 매 폴링마다 확인**

```python
        # 에이전트가 질문을 던지거나 모델 대체를 제안하면 즉시 중단
        # (30분 타임아웃 낭비 방지 + 임의 모델 대체로 인한 과금 방지)
        if await any_visible(page, "agent_blocking_question"):
            txt = await _read_last_agent_message(page)
            raise GenerationFailed(f"에이전트가 진행을 막고 되물음 — 중단: {txt[:200]}")
```

**3) 새 메시지만 잡아야 합니다 (a4와 동일한 baseline 방식)**

```python
async def snapshot_agent_messages(page) -> int:
    """대기 시작 시점의 에이전트 메시지 개수. 이전 대화가 오검출되지 않게."""
```
`wait_new_result(page, baseline_count, baseline_alerts, baseline_agent_msgs)` 로 인자를 확장하고,
**baseline보다 늘어난 메시지에 한해** 차단 문구를 검사하세요.

**4) 생성 후 모델 재검증 (신설)**

에이전트가 몰래 모델을 바꿀 수 있으므로, **각 씬 생성 직후** 현재 선택된 모델을 다시 읽어
`CONFIG.MODEL_LABEL` 과 다르면 **즉시 배치 중단**하세요. 크레딧 100배 사고를 막는 마지막 방어선입니다.

```python
actual = await read_selected_model(page)
if _norm(actual) != _norm(CONFIG.MODEL_LABEL):
    raise RuntimeError(f"생성 중 모델이 변경됨: '{actual}' — 즉시 중단(과금 방어)")
```

---

## C. 다운로드 — F9 실측 반영 (좋은 소식 + 처리할 것 1개)

### 확정된 사실

| 항목 | 실측 |
|---|---|
| 다운로드 방식 | ✅ **현재 창에서 브라우저 다운로드 이벤트 발생** (새 탭 아님) |
| → 코드 영향 | ✅ **`page.expect_download()` 그대로 사용 가능.** R4 §5의 우려는 해소됐습니다 |
| 화질 모달 | ⚠️ **뜸** — "1080p까지 무료 다운로드 가능" 안내 모달 |
| 파일명 패턴 | `{프롬프트},_8초_{화질}p_{날짜시간}.mp4` (예: `멋진촛불,_8초_1080p_202607260806.mp4`) |

### 수정 — 화질 모달을 확실히 처리

R4 §5의 `download_result()` 를 유지하되, **화질 선택을 "있으면 처리"가 아니라 "명시적 단계"로** 만드세요.

```python
        "quality_modal": [
            '[role="dialog"]:has-text("1080p")',
            '[role="dialog"]:has-text("Download")',
            '[role="dialog"]:has-text("다운로드")',
        ],
        "quality_1080p": [
            '[role="dialog"] button:has-text("1080p")',
            'button:has-text("1080p")',
            '[role="dialog"] button:has-text("Download")',
        ],
```

```python
    async with page.expect_download(timeout=180_000) as di:
        await dl.click()
        # 화질 모달은 F9 실측상 "뜬다". 최대 5초까지 기다렸다가 1080p 선택.
        try:
            modal = await first_locator(page, "quality_modal", timeout=5_000)
            btn = await first_locator(modal, "quality_1080p", timeout=3_000)
            await btn.click()
            log.info("  화질 모달: 1080p 선택")
        except PWTimeout:
            log.info("  화질 모달 미출현 — 바로 다운로드 진행")
```

모달이 안 뜨는 경우도 있을 수 있으니 **타임아웃은 예외가 아니라 정상 경로**로 처리하세요.

---

## D. 점 3개 메뉴 전체 목록 확보 — 셀렉터 정밀화 + 금지 항목

F9에 기록된 메뉴 전체 (영어 UI):

```
Favorite · Reuse prompt · Add to scene · Add to prompt · Download ·
Rename · Share · Publish to YouTube · Set project cover · Flag output · Move to trash
```

### D-1. `menu_download` 셀렉터를 좁히세요

`Download` 말고도 `Add to prompt`, `Move to trash` 등이 있습니다. **부분일치로 잘못 누르면 결과물이 삭제됩니다.**

```python
        "menu_download": [
            '[role="menuitem"]:text-is("Download")',      # 완전일치 우선
            '[role="menuitem"]:has-text("Download")',
            '[role="menuitem"]:text-is("다운로드")',
            'li:text-is("Download")',
        ],
```

**`:text-is()`(완전일치)를 맨 앞에 두세요.** `Move to trash` 오클릭은 복구 불가입니다.

### D-2. 【절대 금지】 `Publish to YouTube`

메뉴에 **`Publish to YouTube` 가 있습니다.** 이 항목을 **어떤 경우에도 클릭하는 코드를 만들지 마세요.**

- 업로드 자동화는 프로젝트 전체의 **하드 금지 사항**입니다 (AI 채널 대량 종료의 공통 사유)
- 오클릭 방지를 위해, 메뉴 항목 선택은 반드시 **완전일치(`:text-is`)** 로만 하세요
- 코드 어디에도 `YouTube`, `Publish`, `Share` 문자열이 클릭 대상으로 등장하면 안 됩니다

### D-3. `Add to scene` — 나중을 위해 기록만

Extend 대신 존재하는 기능입니다. **지금은 사용하지 않습니다**(우리 구조는 독립 8초 씬 3개).
`README.md` 에 "더 긴 영상이 필요해지면 `Add to scene` → Scene Builder 경유" 라고 한 줄만 남기세요.

---

## E. 기타 확정 사항

| 항목 | 실측 | 코드 반영 |
|---|---|---|
| **클립 길이** | **정확히 8초** | 영상 1편 = 8초 × 3씬 = **24초**. `README` 와 job 샘플에 명시 |
| 크레딧 잔액 문구 | `XXXXX Google Flow credits` (영어 UI) | `credit_balance` 셀렉터를 `text=/Google Flow credits/i` 로 정밀화 |
| 잔액 위치 | **우상단 프로필 메뉴를 클릭해야 보임** | R4 §T2 그대로 — job 시작/종료 시 1회씩만 읽을 것 |
| 영어 UI 확인 | F4에 "(영어 UI 기준)" 기재 | `/en/` 로케일 고정이 실제로 적용됨. **셀렉터는 영어 우선**으로 정리 |

---

## F. 아직 비어 있는 것 — 추측 금지

**F6 DOM 구조는 여전히 미확인입니다.** ("DOM을 보지 못했으나 타일 형태로 구성됨")

- `result_tile` 의 `[data-result-id]` 는 **여전히 추측값**입니다
- 주석에 **"미검증 — Phase 0.5에서도 DOM 미확인"** 을 명시하고, `video` 폴백에 의존하세요
- **절대 추측으로 확정 표기하지 마세요**

`CONFIG.PHASE0_VERIFIED` 는 **`False` 로 유지**합니다. 실제 브라우저 1회 완주(1편 생성→다운로드→조립)가
성공한 뒤에 제가 `True` 로 여는 지시를 별도로 내리겠습니다.

---

## G. 이번 라운드 완료 조건

R4의 제출 형식에 **아래 3개를 추가**합니다.

1. `grep -n "Lower Priority"` → **금지 목록에만** 등장하고, 기본 모델로는 등장하지 않을 것
2. `grep -n -i "youtube\|publish"` → **클릭 대상으로 등장하지 않을 것** (주석/문서는 허용)
3. `grep -n "agent_blocking_question\|snapshot_agent_messages"` → 신설 확인

> **브라우저 실행은 이번에도 불필요합니다** (`PHASE0_VERIFIED=False` 가드가 막습니다).
> R4 §8의 조립 검증(한글 자막·BGM·loudnorm)만 실제로 돌려서 출력을 첨부하세요.
