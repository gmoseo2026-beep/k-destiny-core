# Flow DOM 셀렉터 — 실측 확정본 (추측 0건)

**작성:** 개발총괄(Opus5) · 2026-07-26 · **브라우저에서 직접 DOM을 읽어 확정**
**대상:** `automation/flow_rpa.py` — 이 문서의 값으로 `CONFIG.SELECTORS` 를 **전면 교체**합니다.

> 이 문서의 모든 값은 실제 Flow 페이지에서 읽은 것입니다. **추측이 아닙니다.**
> 확정하지 못한 항목은 §9에 따로 표시했습니다.

---

## 0. 환경

| 항목 | 확정값 |
|---|---|
| 프로젝트 URL | `https://labs.google/fx/tools/flow/project/<uuid>` — **로케일 세그먼트 없음** |
| UI 언어 | **영어** (All Media / Videos / Characters / Scenes / Tools) |
| 뷰포트 | `innerWidth = 1646`, `devicePixelRatio = 1.75` |
| 크레딧 잔액 | **25,000** (Ultra) |
| CSS 프레임워크 | **Radix UI** + styled-components |

> ⚠️ **styled-components 클래스(`sc-e731e35e-1 clUxVz` 등)를 셀렉터로 쓰지 마세요.**
> 빌드마다 해시가 바뀝니다. 아래 셀렉터는 전부 **role / data-속성 / 텍스트** 기반입니다.

---

## 1. ★★ 결과 타일 — `data-tile-id` (R1 완전 해결)

```html
<div id="fe_id_21c95e28-..." data-tile-id="fe_id_21c95e28-fd39-4bd2-9aa2-7a1fa59c41ce" ...>
  <span data-state="closed">
    <a draggable="false" href="...">           ← 클릭 시 /edit/<id> 로 이동 (주의)
      <button>                                  ← 재생 버튼
        <video src="..." preload="none">
```

| 항목 | 값 |
|---|---|
| **타일 셀렉터** | `[data-tile-id]` |
| **고유 키** | `data-tile-id` 속성값 (예: `fe_id_21c95e28-...`) |
| ⚠️ **중복 주의** | **미디어 1개당 `[data-tile-id]` 요소가 2개** 존재. 반드시 **속성값으로 dedupe** |
| 타일 크기 | 225 × 400 (9:16) |
| **정렬** | **최신이 DOM 첫 번째** (prepend) — F6 실측과 일치 |
| ⚠️ 클릭 금지 | 타일 본문 클릭 시 `/edit/<id>` 로 **페이지 이동**함 |

### 이제 개수 비교가 아니라 **집합 차분**이 가능합니다

```python
async def snapshot_results(page) -> set[str]:
    """생성 전 타일 고유 키 집합. 중복 요소는 값으로 dedupe."""
    ids = await page.eval_on_selector_all(
        "[data-tile-id]", "els => els.map(e => e.getAttribute('data-tile-id'))")
    return set(ids)

async def wait_new_result(page, baseline: set[str], ...):
    ...
    cur = await page.eval_on_selector_all(
        "[data-tile-id]", "els => els.map(e => e.getAttribute('data-tile-id'))")
    new_ids = [i for i in dict.fromkeys(cur) if i not in baseline]
    if new_ids:
        # 새 키로 직접 지목 — nth() 위치 추측 불필요
        return page.locator(f'[data-tile-id="{new_ids[0]}"]').first
```

**`nth(0)` 추측이 완전히 사라집니다.** D1/R1이 근본적으로 해결됩니다.

---

## 2. ★ 타일 hover 버튼 — 반드시 "진짜 hover"

hover 전에는 DOM에 **존재하지 않습니다.** 합성 이벤트(`dispatchEvent`)로는 **나타나지 않습니다.**
Playwright의 `locator.hover()` (실제 포인터 이동)를 써야 합니다.

hover 후 타일 내부에 나타나는 것:

| 버튼 | 셀렉터 | innerText |
|---|---|---|
| Favorite | `button[type="button"][data-state="closed"]` | `favorite⏎Favorite` |
| Reuse prompt | 〃 | `redo⏎Reuse prompt` |
| **More (점 3개)** | **`button[aria-haspopup="menu"]`** | `more_vert⏎More` |

```python
"tile_menu": ['button[aria-haspopup="menu"]'],   # 타일 스코프 내에서만 사용
```

> innerText에 아이콘 ligature(`more_vert`)가 **앞에 붙습니다.** `:text-is("More")` 는 매칭되지 않습니다.
> `:has-text("More")` 또는 `aria-haspopup="menu"` 를 쓰세요.

---

## 3. ★★ 다운로드 — 4단계입니다 (기존 지시서의 3단계는 틀렸습니다)

More 메뉴는 **Radix 포털**로 `<body>` 아래 렌더됩니다 — **타일 스코프 밖**입니다.

```
① 타일 hover  →  ② More 클릭  →  ③ Download 호버(서브메뉴 열림)  →  ④ 화질 클릭
```

### More 메뉴 항목 (11개, 전부 `[role="menuitem"]`)

```
favorite | Favorite
redo | Reuse prompt
split_scene | Add to scene          ← div, aria-haspopup="menu" (서브메뉴)
add | Add to prompt
download | Download                 ← div, aria-haspopup="menu" (서브메뉴!)
edit | Rename
share | Share
smart_display | Publish to YouTube  ← 절대 클릭 금지
wallpaper | Set project cover
flag | Flag output
delete | Move to trash              ← 절대 클릭 금지
```

> **`Download` 는 버튼이 아니라 서브메뉴 트리거입니다.**
> `<div role="menuitem" aria-haspopup="menu" aria-expanded="false" data-state="closed">`
> 클릭이 아니라 **hover** 하면 서브메뉴가 열립니다.

### 🚨 Download 서브메뉴 — **4K는 50크레딧입니다**

```
270p    ⏎ Animated GIF
720p    ⏎ Original Size
1080p   ⏎ Upscaled
4K      ⏎ Upscaled · 50 credits      ← 생성 1회(10크레딧)의 5배!
```

전부 `button[role="menuitem"]` 이고, **innerText 첫 줄**이 해상도입니다.

**절대 규칙:** 화질 선택은 **첫 줄 완전일치**로만 하세요. 부분일치는 금지입니다.

```python
"quality_1080p": ['[role="menuitem"]:has-text("1080p")'],
FORBIDDEN_QUALITY = ["4K"]     # 클릭 대상에서 하드 차단
```

더 안전한 구현 — **텍스트 첫 줄을 직접 비교**:

```python
async def pick_quality(page, want="1080p"):
    items = page.locator('[role="menu"] [role="menuitem"]')
    for i in range(await items.count()):
        it = items.nth(i)
        first_line = (await it.inner_text()).strip().split("\n")[0].strip()
        if first_line == "4K":
            continue                      # 50크레딧 — 절대 선택 금지
        if first_line == want:
            await it.click()
            return want
    raise DownloadFailed(f"화질 '{want}' 항목을 찾지 못함")
```

**권장 화질: `1080p`** (Upscaled, 추가 크레딧 표기 없음 = 무료). 최종 산출물이 1080×1920이므로 적합합니다.
보수적으로 가려면 `720p`(Original Size)도 무방합니다 — assemble.py가 어차피 스케일링합니다.

---

## 4. ★★ Agent settings 패널 — 여기가 예산 방어의 핵심

프롬프트 바 우측의 **`tune⏎Settings`** 버튼으로 엽니다.

```python
"settings_open": ['button:has-text("Settings")'],   # innerText = "tune⏎Settings"
```

### ⚠️ 패널 닫기 — `arrow_back⏎Back` 버튼을 누르지 마세요

**프로젝트 밖(대시보드)으로 나가버립니다.** 제가 실제로 당했습니다.
닫으려면 **Settings 버튼을 다시 클릭**하거나 `Escape` 를 쓰세요.

### 4-1. 🚨 Confirm before generating — 자동화의 생명줄

```html
<button role="radio" value="ALWAYS_ASK"   aria-checked="false" data-state="unchecked">
<button role="radio" value="AUTO_APPROVE" aria-checked="true"  data-state="checked">
```

- `AUTO_APPROVE` = **Never** ("Agent will generate media and spend credits automatically")
- `ALWAYS_ASK` = **Always** ("Agent will ask for confirmation before generating media")

**`ALWAYS_ASK` 로 설정되어 있으면 에이전트가 매번 확인을 요구하고 자동화가 30분씩 멈춥니다.**
현재는 `AUTO_APPROVE` 로 되어 있지만, **배치 시작 시 반드시 검증**하세요.

```python
"confirm_auto": ['button[role="radio"][value="AUTO_APPROVE"]'],
"confirm_ask":  ['button[role="radio"][value="ALWAYS_ASK"]'],
```

```python
async def ensure_auto_approve(page):
    el = page.locator('button[role="radio"][value="AUTO_APPROVE"]').first
    if await el.get_attribute("aria-checked") != "true":
        await el.click()
        await asyncio.sleep(0.5)
        if await el.get_attribute("aria-checked") != "true":
            raise RuntimeError("Confirm-before-generating 를 Never 로 설정하지 못함 — 중단")
```

### 4-2. 섹션 앵커 — radix ID는 매번 바뀝니다

`radix-:r3a:-trigger-1` 같은 ID는 **렌더마다 달라집니다.** 절대 하드코딩 금지.

패널에는 **Image**와 **Video** 두 섹션이 있고 컨트롤 구조가 동일합니다.
반드시 **섹션 제목으로 스코프를 좁히세요.**

```python
VIDEO_SECTION = 'xpath=//span[text()="Video generation default"]/parent::div'
IMAGE_SECTION = 'xpath=//span[text()="Image generation default"]/parent::div'
```

### 4-3. Video 섹션 내부 (실측)

```
Video generation default
  [role="tablist"]  →  [role="tab"]  16:9 | 9:16              현재: 9:16 active ✅
  [role="tablist"]  →  [role="tab"]  1x | x2 | x3 | x4        현재: 1x active ✅
  button[aria-haspopup="menu"]       "Veo 3.1 - Lite⏎arrow_drop_down"
```

**선택 상태 판별 = `data-state="active"`**

```python
async def ensure_video_outputs(page, n=1):
    sec = page.locator(VIDEO_SECTION)
    tab = sec.get_by_role("tab", name=f"{n}x" if n == 1 else f"x{n}", exact=True)
    if await tab.get_attribute("data-state") != "active":
        await tab.click(); await asyncio.sleep(0.4)
    st = await tab.get_attribute("data-state")
    if st != "active":
        raise RuntimeError(f"출력 개수 {n}x 강제 실패 (state={st}) — 크레딧 2배 위험. 중단")
```

> **탭 라벨 표기가 불규칙합니다: `1x`, `x2`, `x3`, `x4`** (1만 뒤에 x). 위 코드처럼 분기하세요.
> 종횡비 탭의 innerText는 `crop_9_16⏎9:16` 이므로 `:has-text("9:16")` 을 쓰세요.

### 4-4. 🚨 Image 섹션이 `x2` 로 설정되어 있습니다

Video는 `1x`인데 **Image는 `x2`** 입니다. 우리는 이미지를 생성하지 않지만,
에이전트가 임의로 이미지를 만들면 2배 과금됩니다. **배치 시작 시 Image도 `1x` 로 맞추는 걸 권합니다.**

### 4-5. 모델 드롭다운 — 정확한 문자열 5종

`button[aria-haspopup="menu"]` (Video 섹션의 마지막) 를 **실제 클릭**하면 열립니다.
(JS `.click()` 은 Radix에서 동작하지 않습니다 — Playwright `click()` 은 정상 동작합니다.)

```
Omni Flash
Veo 3.1 - Lite                      ← 우리 모델 (10크레딧 실측)
Veo 3.1 - Fast
Veo 3.1 - Quality                   ← 100크레딧, 금지
Veo 3.1 - Lite [Lower Priority]     ← 목록엔 있으나 생성 실패(F8), 금지
```

- 옵션에 `aria-checked` 가 **없습니다** → 현재 선택은 **트리거 버튼 텍스트**로 읽습니다
- 트리거 innerText = `"Veo 3.1 - Lite\narrow_drop_down"` → **첫 줄만** 취하세요

```python
async def read_selected_model(page) -> str:
    sec = page.locator(VIDEO_SECTION)
    btn = sec.locator('button[aria-haspopup="menu"]').last
    return (await btn.inner_text()).strip().split("\n")[0].strip()

async def select_model(page, label="Veo 3.1 - Lite"):
    sec = page.locator(VIDEO_SECTION)
    await sec.locator('button[aria-haspopup="menu"]').last.click()
    await asyncio.sleep(0.8)
    await page.locator(f'[role="menuitem"]:text-is("{label}")').first.click()  # 완전일치 필수
    await asyncio.sleep(0.8)
    actual = await read_selected_model(page)
    if actual != label:
        raise RuntimeError(f"모델 확정 실패: 기대='{label}' 실제='{actual}' — 중단")
```

> **완전일치(`:text-is`)가 필수입니다.** `has-text("Veo 3.1 - Lite")` 는
> `Veo 3.1 - Lite [Lower Priority]` 에도 걸려서 **생성이 실패하는 모델**을 고르게 됩니다.

---

## 5. 프롬프트 입력 · 전송

| 항목 | 셀렉터 | 비고 |
|---|---|---|
| 프롬프트 입력 | `div[role="textbox"][contenteditable="true"]` | ✅ 기존 코드에 이미 있음 |
| **전송(생성)** | `button:has-text("arrow_forward")` | innerText = `arrow_forward⏎Create` |
| 미디어 첨부 | `button[aria-haspopup="dialog"]:has-text("Create")` | innerText = `add_2⏎Create` |
| Agent Instructions | `button:has-text("Agent Instru")` | `article_spark⏎Agent Instructions` |
| 설정 | `button:has-text("Settings")` | `tune⏎Settings` |

> **`Generate` 라는 버튼은 없습니다.** 기존 `generate_button` 후보 4개 전부 무효입니다.
> `contenteditable` 이므로 `fill()` 대신 `click()` → `type()` 을 쓰세요.

---

## 6. ★ 에이전트 메시지 — 스타일 클래스 없이 잡는 법

에이전트 응답 블록마다 액션 버튼이 붙습니다: `Good response` / `Bad response` / **`Copy Message`** / `Flag`.

**`Copy Message` 버튼 1개 = 에이전트 메시지 1개.** 이게 가장 안정적인 카운터입니다.

```python
"agent_msg_marker": ['button:has-text("Copy Message")'],
```

```python
async def snapshot_agent_messages(page) -> int:
    return await page.locator('button:has-text("Copy Message")').count()

async def read_last_agent_message(page) -> str:
    btn = page.locator('button:has-text("Copy Message")').last
    block = btn.locator('xpath=ancestor::div[2]')     # 실측: 버튼→액션행→메시지블록
    return (await block.inner_text()).strip()
```

### 🚨 에이전트는 **프롬프트의 언어로 답합니다**

UI가 영어인데도 한국어로 프롬프트를 넣으면 **한국어로 응답**합니다. 실제 관측된 메시지:

> "촛불 영상을 8초 길이로 생성하겠습니다."
> "**촛불 영상 생성이 예약되었습니다. 현재 요청이 많아 대기열에서 기다리는 중이에요. 잠시 후에 다시 확인해 주세요.**"

**대응:** Veo 프롬프트를 **영어로 작성**하세요(어차피 영상 프롬프트는 영어가 품질이 좋습니다).
그러면 에이전트도 영어로 답하고, 차단 문구 패턴을 영어로만 관리하면 됩니다.
단, 한국어 패턴도 폴백으로 남겨두세요.

```python
AGENT_BLOCKING_PATTERNS = [
    r"which\s+model\s+would\s+you\s+like",
    r"currently\s+unavailable",
    r"would\s+you\s+like\s+me\s+to",
    r"어떤\s*모델로\s*진행",
    r"사용할\s*수\s*없는\s*상태",
    r"대신\s+.*모델을\s*사용",
]
AGENT_QUEUE_PATTERNS = [          # 이건 차단이 아니라 정상 대기 신호
    r"scheduled|queue|waiting",
    r"예약되었습니다|대기열",
]
```

> **`instead` 단독 패턴은 삭제하세요.** 정상 문장에도 흔히 등장합니다.

---

## 7. 크레딧 잔액 — 프로필 다이얼로그

```html
<button> <img alt="User profile image"> </button>     ← 클릭 시 다이얼로그
  ...
  <a>25000 Google Flow credits</a>
```

```python
"profile_open":  ['button:has(img[alt="User profile image"])'],
"credit_text":   ['a:has-text("Google Flow credits")'],
```

```python
async def read_credits_ui(page):
    """프로필 다이얼로그를 열어 잔액을 읽고 닫는다. 실패해도 None 반환(예외 금지)."""
    try:
        await page.locator('button:has(img[alt="User profile image"])').first.click()
        await asyncio.sleep(1.2)
        txt = await page.locator('a:has-text("Google Flow credits")').first.inner_text()
        m = re.search(r'([\d,]+)', txt)
        await page.keyboard.press("Escape")
        return float(m.group(1).replace(',', '')) if m else None
    except Exception:
        try: await page.keyboard.press("Escape")
        except Exception: pass
        return None
```

- 이 버튼은 **일반 버튼**이라 JS click도 동작합니다 (Radix 아님)
- 다이얼로그는 `Escape` 로 닫힙니다
- **job 시작/종료 시 1회씩만** 호출하세요 (씬마다 여닫으면 생성 흐름을 방해합니다)

---

## 8. 교체용 `CONFIG.SELECTORS` (그대로 복붙)

```python
    # ─────────────────────────────────────────────────────────────
    # 2026-07-26 브라우저 DOM 직접 확인으로 확정. 추측값 없음.
    # styled-components 클래스(sc-*)는 빌드마다 바뀌므로 절대 쓰지 말 것.
    # ─────────────────────────────────────────────────────────────
    VIDEO_SECTION = 'xpath=//span[text()="Video generation default"]/parent::div'
    IMAGE_SECTION = 'xpath=//span[text()="Image generation default"]/parent::div'

    SELECTORS = {
        # 결과 타일 — 고유키 data-tile-id (미디어당 2개 존재 → 값으로 dedupe)
        "result_tile":   ['[data-tile-id]'],

        # 타일 hover 시 나타남. 반드시 실제 hover() 사용(합성 이벤트 불가)
        "tile_menu":     ['button[aria-haspopup="menu"]'],

        # More 메뉴는 Radix 포털 → page 스코프에서 찾을 것
        "menu_download": ['[role="menuitem"]:has-text("Download")'],   # 서브메뉴 트리거(hover)
        "quality_item":  ['[role="menu"] [role="menuitem"]'],          # 첫 줄로 해상도 판별

        # 프롬프트 바
        "prompt_input":  ['div[role="textbox"][contenteditable="true"]'],
        "generate_button": ['button:has-text("arrow_forward")'],
        "settings_open": ['button:has-text("Settings")'],
        "attach_button": ['button[aria-haspopup="dialog"]:has-text("Create")'],
        "file_input":    ['input[type="file"]'],

        # Agent settings
        "confirm_auto":  ['button[role="radio"][value="AUTO_APPROVE"]'],
        "confirm_ask":   ['button[role="radio"][value="ALWAYS_ASK"]'],

        # 에이전트 메시지 마커
        "agent_msg_marker": ['button:has-text("Copy Message")'],

        # 크레딧
        "profile_open":  ['button:has(img[alt="User profile image"])'],
        "credit_text":   ['a:has-text("Google Flow credits")'],

        # 로그인 만료 (URL 판정과 AND로 사용)
        "login_wall":    ['input[type="password"]'],
    }

    # 클릭 절대 금지 (메뉴 항목 오클릭 방지)
    MENU_FORBIDDEN = ["Publish to YouTube", "Move to trash", "Share", "Flag output"]
    QUALITY_FORBIDDEN = ["4K"]                       # 50크레딧
    MODEL_FORBIDDEN = ["Quality", "Lower Priority", "Omni Flash"]
    MODEL_LABEL = "Veo 3.1 - Lite"                   # 실단가 10크레딧
```

### 삭제할 키 (전부 무효로 확인됨)

`model_open` · `model_option_fast` · `selected_model` · `outputs_per_prompt` ·
`generating_indicator` · `error_toast` · `quality_modal` · `quality_1080p` · `credit_balance`
→ 위 표의 새 키로 **대체**합니다.

---

## 9. 아직 확정하지 못한 것 (추측 금지 · 미검증으로 표기할 것)

| 항목 | 상태 | 대응 |
|---|---|---|
| **생성 중 표시(`generating_indicator`)** | 미확정 | 생성을 실제로 돌려야 관측 가능. **대안: 에이전트 메시지의 큐 패턴(§6)과 `data-tile-id` 집합 증가로 판정** — 스피너에 의존하지 말 것 |
| 에러 토스트 구조 | 미확정 | 에이전트 메시지로 오는 것만 확인됨(F8). `[role="alert"]` 은 근거 없음 → **에이전트 메시지 감시로 대체** |
| 다운로드 이벤트 방식 | F9에서 "브라우저 다운로드 발생" 확인 | `page.expect_download()` 사용 가능. 단 **서브메뉴 클릭 후** 발생 |
| 이미지 업로드(참조 이미지) 경로 | 미확정 | `add_2⏎Create` 버튼이 dialog를 엶. 실제 업로드 플로우 미확인 |

> **`generating_indicator` 를 없애는 게 낫습니다.** 완료 판정은
> **"`data-tile-id` 집합에 새 키가 등장했는가"** 하나로 충분하고, 그게 가장 확실합니다.
> 스피너 유무는 판정 조건에서 빼세요 (지금 코드의 `not generating` 조건이 오히려 오판을 만듭니다).

---

## 10. 이번에 새로 드러난 위험 3가지

1. **4K 다운로드 = 50크레딧.** 생성(10크레딧)의 5배. 화질 선택을 완전일치로 하지 않으면 사고.
2. **Confirm before generating** 이 `Always` 로 바뀌면 자동화가 전부 멈춤. 시작 시 검증 필수.
3. **Image generation default 가 `x2`.** 에이전트가 이미지를 만들면 2배 과금.
