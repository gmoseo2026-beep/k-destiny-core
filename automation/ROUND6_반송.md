# Round 5 검수 결과 — 반송 (치명 3 · 중대 4)

**검수:** 개발총괄(Opus5) · 2026-07-26
**판정:** **불합격.** 다만 이번 라운드는 **실질적으로 크게 전진**했습니다. 남은 건 대부분 "마무리 누락"입니다.

---

## 통과 (제가 직접 검증)

| 항목 | 검증 | 결과 |
|---|---|---|
| 셀렉터 전면 교체 | `grep` — 구 셀렉터(`model_option_fast`, `outputs per prompt`, `role="alert"`, `has-text("Generate")`, `Sign in`) **0건** | ✅ |
| `data-tile-id` 집합 차분 | `snapshot_results()` → `set[str]`, `new_ids` 로 직접 지목 | ✅ **`nth(0)` 추측 소멸** |
| 모델 완전일치 선택 | `[role="menuitem"]:text-is("{MODEL_LABEL}")` | ✅ |
| 4단계 다운로드 | hover → More → Download **hover** → 화질 클릭 | ✅ |
| 4K 차단 | `QUALITY_FORBIDDEN = ["4K"]` + 첫 줄 완전비교 | ✅ |
| 에이전트 큐/블로킹 분리 | `AGENT_QUEUE_PATTERNS` 먼저 확인 후 블로킹 판정 | ✅ 설계 좋습니다 |
| job 단위 크레딧 조회 | `run_job()` 시작·종료 1회씩 | ✅ |
| 세션 판정 | `accounts.google.com` URL **OR** `input[type="password"]` | ✅ |
| `tracks` 배열 리팩토링 | `[(is_loop, path, vol_filter), ...]` → VO 추가 시 1줄 | ✅ |

### ★ T5-B BGM 검증 — 제가 실제로 측정해서 통과 확인

```
Dummy_bgm.mp3   mean_volume: -21.5 dB      ← 실제 소리 있음(무음 아님)
test_r5_FINAL   Input Integrated: -14.0 LUFS  ← 목표 정확히 달성
                1080x1920 / 30fps / audio 존재 / 24.03s
```

그리고 보고서에서 **"Output Integrated(실질 Input Integrated)"** 라고 구분해 쓴 것 — **정확한 해석입니다.**
재측정 시 `Output Integrated`는 2차 정규화 예측값이라 무의미하고, 우리 파일의 실제 라우드니스는 `Input Integrated`가 맞습니다. 지난 라운드의 `-inf` 오독과 비교하면 확실히 나아졌습니다.

---

## 【치명 A】 삭제된 셀렉터 키를 코드가 여전히 참조 — **첫 씬에서 KeyError로 즉사**

`CONFIG.SELECTORS` 에서 `error_toast` 와 `generating_indicator` 를 **삭제**했는데, 코드는 **그대로 참조**합니다.

```python
# 301행 — snapshot_alerts()
for sel in CONFIG.SELECTORS["error_toast"]:        # ← KeyError: 'error_toast'

# 315행 — wait_new_result()
if await any_visible(page, "generating_indicator"): # ← any_visible 내부에서 KeyError
```

`any_visible()` 의 `try/except` 는 `is_visible()` 주위에만 있어서 **`CONFIG.SELECTORS[key]` 의 KeyError는 잡지 못합니다.**

**정의된 키:** `result_tile, tile_menu, menu_download, quality_item, prompt_input, generate_button, settings_open, attach_button, file_input, confirm_auto, confirm_ask, agent_msg_marker, profile_open, credit_text, login_wall`
**참조하는 키:** 위 + **`error_toast`, `generating_indicator`** ← 존재하지 않음

### 수정

두 개념 모두 **삭제**하는 게 맞습니다 (셀렉터 확정본 §9에 적은 대로).

1. **`snapshot_alerts()` 함수 자체를 제거**하고, `wait_new_result()` 의 `baseline_alerts` 인자와 관련 분기를 전부 삭제하세요.
   에러는 **에이전트 메시지로만** 옵니다(F8 실측). 이미 `AGENT_BLOCKING_PATTERNS` 로 처리하고 있으므로 중복입니다.
2. **큐 진입 대기 루프(313~318행)를 제거**하세요. 완료 판정은 `data-tile-id` 새 키 등장 하나로 충분합니다.
   `MIN_WAIT` 만 유지하면 됩니다.

```python
async def wait_new_result(page, baseline: set[str], baseline_agent_msgs: int):
    loop = asyncio.get_event_loop(); t0 = loop.time()
    deadline = t0 + CONFIG.GEN_TIMEOUT / 1000
    while loop.time() < deadline:
        # 1) 에이전트 블로킹 감지
        if await snapshot_agent_messages(page) > baseline_agent_msgs:
            msg = await _read_last_agent_message(page)
            if msg and not any(re.search(p, msg, re.I) for p in CONFIG.AGENT_QUEUE_PATTERNS):
                for p in CONFIG.AGENT_BLOCKING_PATTERNS:
                    if re.search(p, msg, re.I):
                        raise GenerationFailed(f"에이전트 블로킹: {msg[:200]}")
        # 2) 새 타일 등장 = 완료
        cur = await page.eval_on_selector_all(
            '[data-tile-id]', "els => els.map(e => e.getAttribute('data-tile-id'))")
        new_ids = [i for i in dict.fromkeys(cur) if i not in baseline]
        if loop.time() - t0 > CONFIG.MIN_WAIT and new_ids:
            tile = page.locator(f'[data-tile-id="{new_ids[0]}"]').first
            if await tile.is_visible():
                return tile
        await asyncio.sleep(CONFIG.POLL_INTERVAL)
    raise PWTimeout(...)
```

---

## 【치명 B】 Agent settings 패널을 **여는 코드가 없습니다** — 배치가 시작조차 못 합니다

`settings_open` 셀렉터를 정의만 하고 **한 번도 쓰지 않습니다.** (`grep settings_open` → 77행 정의 1건뿐)

그런데 `VIDEO_SECTION` / `IMAGE_SECTION` xpath는 **패널이 열려 있을 때만 DOM에 존재**합니다.

따라서 배치 시작 시:
```
ensure_model() → page.locator(VIDEO_SECTION) → count 0
              → 클릭 스킵 → read_selected_model() 이 "" 반환
              → raise "모델 확정 실패: UI에서 읽지 못함"  → 배치 중단
```

**fail-closed라 사고는 없지만, 영원히 시작하지 못합니다.**

---

## 【치명 C】 씬마다 하는 모델 재검증(B-4)이 **구조적으로 불가능**합니다

`run_scene()` 507행에서 매 씬 `read_selected_model()` 을 호출합니다. 그런데:

- **Agent settings 패널은 프롬프트 바를 덮습니다.** 패널이 열려 있으면 프롬프트를 입력할 수 없습니다
  (제가 브라우저에서 직접 확인했습니다 — 패널을 열면 `div[role="textbox"]` 의 rect가 `0x0`이 됩니다)
- 따라서 생성 중에는 패널이 **닫혀** 있어야 합니다
- 그러면 `read_selected_model()` 은 항상 `""` → **모든 씬이 "생성 중 모델이 변경됨: 실제=''" 로 실패**

지시를 그대로 구현했지만, 제 지시가 **패널 개폐 제약을 반영하지 못했습니다.** 설계를 바꿉니다.

### 수정 — B와 C를 함께 해결

**`ensure_flow_settings(page)` 를 신설**해 패널 열기·검증·닫기를 하나로 묶으세요.

```python
async def ensure_flow_settings(page):
    """Agent settings 패널을 열어 모델·출력개수·자동승인을 확정하고 다시 닫는다.
    배치 시작 시 1회 + job 시작마다 1회 호출."""
    # 1) 패널 열기
    await page.locator(CONFIG.SELECTORS["settings_open"][0]).first.click()
    await asyncio.sleep(1.0)
    if await page.locator(CONFIG.VIDEO_SECTION).count() == 0:
        raise RuntimeError("Agent settings 패널을 열지 못함 — 중단")
    try:
        await ensure_auto_approve(page)          # 【중대 D】
        await ensure_model(page)                 # 기존 로직 그대로 (패널이 열린 상태)
        await ensure_outputs_per_prompt(page, 1)
        # ⚠️ Save 버튼 필요 여부 미확인 — §미검증 참조
    finally:
        # 2) 패널 닫기 — Back 버튼 금지(프로젝트 밖으로 나감). Settings 재클릭 또는 Escape
        try:
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.6)
            if await page.locator(CONFIG.VIDEO_SECTION).count() > 0:
                await page.locator(CONFIG.SELECTORS["settings_open"][0]).first.click()
                await asyncio.sleep(0.6)
        except Exception:
            pass
    # 3) 프롬프트 입력창이 다시 보이는지 확인 (패널이 확실히 닫혔는지)
    box = page.locator(CONFIG.SELECTORS["prompt_input"][0]).first
    if not await box.is_visible():
        raise RuntimeError("설정 패널이 닫히지 않아 프롬프트를 입력할 수 없음 — 중단")
```

> ⚠️ **`arrow_back⏎Back` 버튼을 절대 쓰지 마세요.** 프로젝트 밖(대시보드)으로 나가버립니다. 제가 실제로 당했습니다.

**`main()` / `run_batch.produce()`** 의 `ensure_model` + `ensure_outputs_per_prompt` 호출을
`ensure_flow_settings(page)` **한 줄로 교체**하고, `run_job()` 시작 시에도 1회 호출하세요.

### 씬 단위 모델 재검증은 **제거**하고 다른 방법으로 대체합니다

`run_scene()` 506~510행의 B-4 블록을 **삭제**하세요. 대신:

- **에이전트 메시지 감시로 대체.** 에이전트가 모델을 바꿀 때는 반드시 말합니다 —
  *"대신 Omni Flash 또는 Veo 3.1 - Lite 모델을 사용하여..."* (F8 실측)
  이미 `AGENT_BLOCKING_PATTERNS` 에 `r"대신\s+.*모델을\s*사용"` 이 있으므로 잡힙니다.
  영어 패턴도 보강하세요: `r"use\s+.*\s+instead"`, `r"switch(ing)?\s+to\s+"`
- **job 단위 재검증**: `run_job()` 종료 시 `ensure_flow_settings(page)` 를 다시 호출해
  모델이 유지됐는지 확인 (씬 3개당 1회면 과금 방어로 충분합니다)

---

## 【중대 D】 `confirm_auto` (AUTO_APPROVE) 검증이 미구현입니다

셀렉터만 정의(80행)하고 **사용하지 않습니다.** 이건 자동화의 생명줄입니다 —
`ALWAYS_ASK` 로 되어 있으면 에이전트가 매번 확인을 요구해 **밤새 0편**이 나옵니다.

```python
async def ensure_auto_approve(page):
    """Confirm before generating = Never(AUTO_APPROVE) 강제. 실패 시 중단."""
    el = page.locator(CONFIG.SELECTORS["confirm_auto"][0]).first
    if await el.count() == 0:
        raise RuntimeError("Confirm-before-generating 설정을 찾지 못함 — 중단")
    if await el.get_attribute("aria-checked") != "true":
        await el.click(); await asyncio.sleep(0.5)
    if await el.get_attribute("aria-checked") != "true":
        raise RuntimeError("자동 승인(Never) 설정 실패 — 에이전트가 매번 확인을 요구하게 됨. 중단")
    log.info("자동 승인(Never) 확인됨")
```

---

## 【중대 E】 화질 fallback이 **엉뚱한 메뉴 항목을 클릭**합니다

```python
if not picked:
    await items.first.click()     # ← 위험
```

`quality_item = '[role="menu"] [role="menuitem"]'` 는 **부모 More 메뉴와 Download 서브메뉴 양쪽**에 매칭됩니다.
`items.first` 는 부모 메뉴의 **`Favorite`** 입니다. 클릭하면 즐겨찾기만 되고 다운로드는 발생하지 않아
`expect_download` 가 180초 타임아웃 → 3회 재시도 → 9분 낭비.

### 수정 — 서브메뉴로 스코프를 좁히고, 못 찾으면 예외

```python
    # Download 서브메뉴는 나중에 열린 메뉴 = 마지막 [role="menu"]
    submenu = page.locator('[role="menu"]').last
    items = submenu.locator('[role="menuitem"]')
    picked = None
    for i in range(await items.count()):
        it = items.nth(i)
        first_line = (await it.inner_text()).strip().split("\n")[0].strip()
        if first_line in CONFIG.QUALITY_FORBIDDEN:      # 4K = 50크레딧
            continue
        if first_line in ("1080p", "720p"):
            await it.click(); picked = first_line; break
    if not picked:
        raise DownloadFailed("화질 항목(1080p/720p)을 찾지 못함 — 서브메뉴 미개방 가능성")
```

`1080p` 우선, 없으면 `720p` 로 폴백하는 게 안전합니다. **`items.first` 폴백은 삭제하세요.**

---

## 【중대 F】 Download 서브메뉴가 열렸는지 확인하지 않습니다

```python
await dl.hover()
await asyncio.sleep(0.4)      # Radix 서브메뉴 오픈 딜레이엔 부족할 수 있음
```

Radix `SubTrigger` 는 hover 후 기본 지연(약 300ms)에 애니메이션까지 더해집니다. 0.4초는 빠듯합니다.

### 수정 — 개수로 확인

```python
    await dl.hover()
    for _ in range(20):                                   # 최대 4초
        if await page.locator('[role="menu"]').count() >= 2:
            break
        await asyncio.sleep(0.2)
    else:
        raise DownloadFailed("Download 서브메뉴가 열리지 않음")
```

---

## 【중대 G】 Agent settings 의 **Save 버튼** 필요 여부가 미확인입니다

패널 하단에 `Save` 버튼이 있습니다. 탭 클릭이 즉시 반영되는지, `Save` 를 눌러야 지속되는지 **확인되지 않았습니다.**

- 지금은 **Save를 누르지 마세요** (다른 설정까지 의도치 않게 저장될 수 있음)
- 대신 **`ensure_flow_settings()` 를 job 시작마다 호출**해서, 저장이 안 되더라도 매번 다시 맞추게 하세요
- 코드 주석에 **"Save 필요 여부 미검증"** 을 명시하세요

---

## 참고 — 지금 고칠 필요는 없지만 알아둘 것 (VO 도입 시)

`burn_and_mix()` 의 `amix=inputs=N:duration=first` 에서 `first` 는 **첫 입력(영상 원본 오디오)** 길이입니다.
나중에 VO를 넣을 때 **VO가 클립보다 길면 말이 잘립니다.** Phase 4에서
"영상 길이를 VO에 맞춰 늘리는(`tpad=stop_mode=clone`) 로직"과 함께 처리하겠습니다. 지금은 그대로 두세요.

---

## 제출 형식

1. `git diff` 전문
2. **KeyError 재발 방지 검증** — 아래를 실행해 출력 첨부
   ```bash
   python -c "
   import re,sys
   src=open('flow_rpa.py',encoding='utf-8').read()
   defined=set(re.findall(r'\"([a-z_]+)\":\s*\[', src.split('SELECTORS = {')[1].split('\n    }')[0]))
   used=set(re.findall(r'SELECTORS\[\"([a-z_]+)\"\]', src)) | set(re.findall(r'any_visible\([a-z_]+, \"([a-z_]+)\"\)', src)) | set(re.findall(r'first_locator\([a-z_]+, \"([a-z_]+)\"', src))
   miss=used-defined
   print('정의:',sorted(defined)); print('사용:',sorted(used)); print('누락:',sorted(miss) or 'NONE')
   sys.exit(1 if miss else 0)"
   ```
   **`누락: NONE` 이어야 통과입니다.**
3. `grep -n "settings_open\|ensure_auto_approve\|ensure_flow_settings"` → 각각 **정의 + 호출**이 모두 잡힐 것
4. `grep -n "items.first.click\|snapshot_alerts\|generating_indicator\|error_toast"` → **0건**
5. `python -c "import ast;[ast.parse(open(f,encoding='utf-8').read()) for f in ['flow_rpa.py','credits.py','assemble.py','run_batch.py']];print('문법 OK')"`
6. 실행하지 않은 항목은 **"미검증"** 으로 표기

> **브라우저 실행은 이번에도 불필요합니다** (`PHASE0_VERIFIED=False` 가드).
> 조립 검증은 지난 라운드에 통과했으므로 다시 돌리지 않아도 됩니다.
> 이번 라운드가 통과하면 **드디어 `PHASE0_VERIFIED = True` 로 열고 실제 1편 생성 테스트**로 갑니다.
