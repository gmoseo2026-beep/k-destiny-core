# Round 4 지시서 — Extend 제거 + Phase 0 반영 (Round 3 통합)

> 개발총괄(Opus5) → Antigravity
> **먼저 알림: Round 3(T1~T5)이 아직 반영되지 않았습니다.** `flow_rpa.py`·`assemble.py` 수정 시각이
> Round 3 지시 이전 상태 그대로입니다. 이 문서가 **Round 3를 흡수한 통합 지시서**이니 이것만 따르세요.
> **모든 응답 한글. 실행하지 않은 항목은 "미검증"으로 표기.**

---

## 0. Phase 0 실측 결과 — 확정된 사실

`automation/FLOW_UI_FACTS.md` 를 읽고 아래를 전제로 작업합니다.

| 사실 | 값 |
|---|---|
| 편집기 URL | `labs.google/fx/<locale>/tools/flow/project/<uuid>` |
| **모델 목록** | `Omni Flash` / `Veo 3.1 - Lite` / `Veo 3.1 - Fast` / `Veo 3.1 - Quality` / **`Veo 3.1 - Lite [Lower Priority]`** |
| **`Fast [Lower Priority]` 는 존재하지 않음** | Lower Priority는 **Lite 전용** |
| 모델 드롭다운 위치 | 프롬프트 입력창 안 **설정 아이콘** → 에이전트 설정 패널 |
| 크레딧 표시 | 모델 목록에는 **표시되지 않음.** 우상단 프로필 메뉴 안에 `XXXXX Google Flow 크레딧` |
| **출력 개수** | 에이전트 설정 패널 "동영상 생성 기본값" 하단. `1x`/`x2`/`x3`/`x4`, **현재 `1x`** |
| **결과 정렬** | **최신이 왼쪽(앞)에 prepend** → DOM 첫 번째가 최신 |
| **다운로드 경로** | 타일의 **점 3개 메뉴 안**에 "다운로드" |
| 대기 토스트 | 우하단 · "영상이 예약되어 대기열에서 기다리고 있습니다. 완성될 때까지 잠시만 기다려 주세요!" |
| **Extend** | 갤러리 타일 점3개 메뉴에 **없음** |

---

## 1. 【최우선 · 아키텍처 변경】 Extend를 파이프라인에서 완전히 제거한다

### 왜

Extend는 "마스터 1명이 22초 동안 계속 말한다"는 옛 기획을 위한 장치였습니다. 콘텐츠 포맷이
**"나레이터 후크 + 3갈래 분기"** 로 바뀌면서, 영상은 **독립된 장면 3개**로 구성됩니다.
Veo 3.1은 1회 생성에 8초를 만들므로 **8초 × 3 = 24초** — Extend가 개입할 자리가 없습니다.

### 새 구조

```
영상 1편 = 독립 씬 3개 = 생성 3회
  scene_01.mp4 (8s)  +  scene_02.mp4 (8s)  +  scene_03.mp4 (8s)  =  24s
```

### 삭제할 것 (전부 제거, 주석 처리 아님)

- `CONFIG.EXTEND_DOWNLOAD_MODE`
- `CONFIG.DEFAULT_EXTEND`
- `SELECTORS["extend_button"]`
- `Scene.extend` 필드
- `run_scene()` 의 Extend 루프 전체 (511~556행 영역)
- `_get_expected_files()` 의 cumulative/delta 분기 → **단순화**
- `assemble.py` 의 `extend_mode` 참조
- manifest의 `extend_mode` 필드

### 새 `run_scene()` 구조 (씬 = 생성 1회 = 파일 1개)

```python
async def run_scene(page, sc: Scene, out_dir: Path):
    out_path = out_dir / f"scene_{sc.n:02d}.mp4"

    # 재개: 파일이 있으면 그대로 스킵 (판정이 자명해짐)
    if out_path.exists():
        log.info("씬 %02d 이미 존재 → 스킵", sc.n)
        return [out_path]

    for attempt in range(1, CONFIG.RETRIES + 2):
        ...
        baseline_count  = await snapshot_results(page)
        baseline_alerts = await snapshot_alerts(page)
        entry_id = credits.record(meta=..., state="pending")
        try:
            await upload_image(page, sc.ref_image)
            await submit_prompt_and_generate(page, sc.prompt)
        except Exception as e:
            credits.update_state(entry_id, "void")      # 제출 전 실패 = 소모 없음
            raise GenerationFailed(str(e))
        try:
            new_tile = await wait_new_result(page, baseline_count, baseline_alerts)
            credits.update_state(entry_id, "confirmed")
        except Exception as e:
            credits.update_state(entry_id, "spent_unconfirmed")   # 이미 소모됨. void 금지
            raise GenerationFailed(str(e))
        ... 다운로드 (3회 재시도) ...
        return [out_path]
```

**이 변경으로 Round 3의 R5·R6이 자동으로 무효화됩니다.** 해당 코드를 지우면 끝입니다.

---

## 2. 【치명】 모델 선택을 실측값에 맞춘다

### 2.1 CONFIG 교체

```python
    # Phase 0 실측(2026-07-26) 기준. Fast에는 Lower Priority가 없다.
    MODEL_LABEL = os.environ.get("FLOW_MODEL", "Veo 3.1 - Lite [Lower Priority]")
    MODEL_FALLBACK_FORBIDDEN = ["Quality"]   # 절대 선택되면 안 되는 모델(100크레딧)
```

- `MODEL_PRIORITY_HINT` 는 **삭제**한다 (별도 힌트가 필요 없음 — 라벨 하나로 특정된다)
- 환경변수 `FLOW_MODEL` 로 바꿀 수 있게 한다 (Lite↔Fast 전환을 코드 수정 없이)

### 2.2 문자열 비교를 정규화한다

`"veo3-fast"` vs `"Veo 3.1 - Fast"` 처럼 공백·하이픈·점 때문에 실패하지 않도록:

```python
def _norm(s: str) -> str:
    """비교용 정규화: 소문자 + 공백·하이픈·점·대괄호 제거"""
    return re.sub(r"[\s\-\.\[\]_]", "", (s or "").lower())
# _norm("Veo 3.1 - Lite [Lower Priority]") == "veo31litelowerpriority"
```

### 2.3 fail-closed를 진짜로 구현한다 (R3)

현재 코드는 `if actual and (...)` 라서 **UI 텍스트를 못 읽으면 검증을 건너뜁니다.** 고칩니다.

```python
async def ensure_model(page):
    # 1) 설정 아이콘 클릭 → 에이전트 설정 패널 열기
    # 2) 모델 드롭다운에서 CONFIG.MODEL_LABEL 항목 선택
    # 3) 패널을 닫지 말고 현재 선택 텍스트를 다시 읽는다
    actual = await read_selected_model(page)

    if not actual:
        raise RuntimeError("모델 확정 실패: 선택된 모델을 UI에서 읽지 못함 — 예산 보호를 위해 중단")
    if _norm(CONFIG.MODEL_LABEL) != _norm(actual):
        raise RuntimeError(f"모델 확정 실패: 기대='{CONFIG.MODEL_LABEL}' 실제='{actual}' — 중단")
    for bad in CONFIG.MODEL_FALLBACK_FORBIDDEN:
        if _norm(bad) in _norm(actual):
            raise RuntimeError(f"금지 모델 선택됨('{actual}') — 100크레딧 모델. 즉시 중단")
    log.info("모델 확정: %s", actual)
```

**`actual` 이 빈 문자열이면 반드시 예외를 던집니다.** 이게 R3의 핵심입니다.

---

## 3. 【치명】 출력 개수 `1x` 강제 — 진짜 fail-closed로 (R2)

현재 코드는 요소를 못 찾으면 `count()==0` → `if` 통과 못 함 → **예외 없이 그냥 반환**합니다.

**실측 정보:** 에이전트 설정 패널 안 "동영상 생성 기본값" 하단, 값은 `1x`/`x2`/`x3`/`x4`.

```python
async def ensure_outputs_per_prompt(page, n=1):
    """출력 개수를 1x로 강제. 확인 못 하면 중단(D8/R2)."""
    # 1) 에이전트 설정 패널이 열려 있지 않으면 연다
    # 2) "동영상 생성 기본값" 영역에서 1x 옵션을 클릭
    # 3) 현재 선택값을 다시 읽어 검증
    current = await read_outputs_setting(page)     # 예: "1x"
    if not current:
        raise RuntimeError("출력 개수 확인 실패 — 2개 출력이면 크레딧이 2배. 중단")
    if _norm(current) != _norm(f"{n}x"):
        raise RuntimeError(f"출력 개수 강제 실패: 기대='{n}x' 실제='{current}' — 중단")
    log.info("출력 개수 확정: %s", current)
```

**요소를 못 찾은 경우(`count()==0`)도 반드시 예외 경로입니다.** 실패 시 스크린샷을 남기세요.

---

## 4. 결과 타일 선택 — 실측 반영 (R1)

### 4.1 `nth(0)` 이 맞았습니다 — 근거를 주석에 남기세요

```python
        # Phase 0 F6 실측(2026-07-26): 갤러리는 최신 결과를 왼쪽에 prepend 한다.
        # 따라서 DOM 첫 번째 = 최신. nth(0)이 정답이다. (추측 아님)
        return loc.nth(0)
```

### 4.2 단, 반환 전에 "정말 새 타일인가"를 단정하세요

개수 증가만으로 판정하면, 다른 이유로 타일이 늘어난 경우 오판합니다.

```python
if elapsed > CONFIG.MIN_WAIT and (not generating) and current_count > baseline_count:
    tile = loc.nth(0)
    # 타일이 재생 가능한 상태인지 최소 확인(placeholder/에러 타일 배제)
    if not await tile.is_visible():
        await asyncio.sleep(CONFIG.POLL_INTERVAL); continue
    return tile
```

### 4.3 `result_tile` 셀렉터는 **아직 미확정**입니다

F6에서 DOM을 확인하지 못했습니다. 현재 후보(`[data-result-id]`)는 추측입니다.

- 주석에 **"Phase 0.5 DOM 확인 전까지 미검증"** 을 명시하세요
- 사용자가 DOM 정보를 주면 그때 교체합니다
- 그 전까지는 `video` 폴백에 의존합니다

---

## 5. 【치명】 다운로드를 "점 3개 → 다운로드" 2단계로 재작성

**현재 코드는 타일 안에서 다운로드 버튼을 바로 찾습니다. 실측상 그런 버튼은 없습니다.**
반드시 **hover → 점3개 클릭 → 메뉴에서 다운로드 클릭** 3단계입니다.

### 셀렉터 추가

```python
        # 타일의 점 3개(더보기) 메뉴 버튼
        "tile_menu": [
            'button[aria-label*="more" i]',
            'button[aria-label*="options" i]',
            'button[aria-label*="더보기" i]',
            'button:has(svg[aria-label*="more" i])',
        ],
        # 열린 메뉴 안의 다운로드 항목
        "menu_download": [
            '[role="menuitem"]:has-text("Download")',
            '[role="menuitem"]:has-text("다운로드")',
            'li:has-text("Download")',
            'li:has-text("다운로드")',
        ],
```

### `download_result()` 재작성

```python
async def download_result(result_locator, out_path: Path):
    """타일 hover → 점3개 → 다운로드. Phase 0 F6 실측 반영."""
    page = result_locator.page
    out_path.parent.mkdir(parents=True, exist_ok=True)

    await result_locator.hover()
    await asyncio.sleep(0.4)                       # 메뉴 버튼이 나타날 시간
    menu_btn = await first_locator(result_locator, "tile_menu", timeout=10_000)
    await menu_btn.click()
    await asyncio.sleep(0.4)                       # 메뉴 펼침 대기

    # 메뉴는 포털로 body 아래 렌더될 수 있으므로 page 스코프에서 찾는다
    dl = await first_locator(page, "menu_download", timeout=10_000)

    async with page.expect_download(timeout=180_000) as di:
        await dl.click()
        # 화질 선택 팝업이 있으면(F9 미확인) 최고 화질 선택
        try:
            await asyncio.sleep(0.6)
            q = page.locator(CONFIG.SELECTORS["quality_option"][0]).first
            if await q.count() > 0 and await q.is_visible():
                await q.click()
        except Exception:
            pass
    ...
```

> **주의 (미확인 리스크):** 다운로드가 `page.expect_download()` 로 잡히는지 **아직 확인되지 않았습니다(F9)**.
> 새 탭이 열리거나 blob URL 방식이면 이 코드는 작동하지 않습니다.
> 그때는 `page.on("download")` 이벤트 리스너 방식이나 `context.on("page")` 로 새 탭을 처리해야 합니다.
> **지금은 위 방식으로 구현하되, 실패 시 대안 경로를 주석으로 남겨두세요.**

---

## 6. Round 3 잔여 항목 (T1~T4) — 그대로 유효

### T1 · 시작 가드 (최우선)

```python
    # Phase 0.5(다운로드 동작·DOM·실단가) 확인 및 반영 후 True 로 변경할 것.
    PHASE0_VERIFIED = False
```

`connect_browser()` 직후, **생성이 한 번도 일어나기 전에** 검사해 중단:

```python
if not CONFIG.PHASE0_VERIFIED:
    raise RuntimeError(
        "Phase 0.5 미검증 상태입니다. 지금 실행하면 (1) 다운로드가 실패하거나 "
        "(2) 엉뚱한 타일을 받거나 (3) 잘못된 모델이 선택될 수 있습니다.\n"
        "automation/FLOW_UI_FACTS.md 의 F4·F6·F9 를 채우고 반영한 뒤 "
        "CONFIG.PHASE0_VERIFIED = True 로 바꾸세요."
    )
```

`flow_rpa.py` 와 `run_batch.py` **양쪽 진입점 모두**. **CDP 연결 에러보다 먼저** 나오도록 순서를 맞출 것.

### T2 · 크레딧 실측 대조 연결

`read_credits_ui()` 반환값을 지금은 아무도 안 씁니다. 연결하세요.

- 생성 **직전** 잔액 `before`, 완료 **직후** `after` → `observed = before - after`
- `credits.update_state(entry_id, "confirmed", observed_cost=observed)`
- 파싱 실패(`None`)면 경고 로그 1회, 예외 금지
- **실측 정보:** 잔액은 **우상단 프로필 메뉴를 클릭해야** 보입니다. 상시 노출이 아니므로
  `read_credits_ui()` 가 **프로필 메뉴를 열고 → 읽고 → 닫는** 동작을 해야 합니다.
  이 동작이 생성 흐름을 방해하면, **씬마다가 아니라 job 시작/종료 시 1회씩만** 읽어 job 단위 총 소모를 기록하세요 (그게 더 안전합니다)

### T3 · 세션 감지 오검출 방지

`text=/Sign in/i` 단독 판정 금지. AND 조건으로:

1. `page.url` 에 `accounts.google.com` 포함 → 세션 만료 확정
2. 셀렉터는 `input[type="password"]` 로 좁힘
3. 감지 시 로그에 `page.url` 함께 기록

### T4 · ffprobe 부재 처리

```python
import shutil, subprocess           # 파일 상단으로 이동
HAS_FFPROBE = shutil.which("ffprobe") is not None
```

- 없으면 시작 시 1회 경고, **길이 검증은 건너뛴다** (파일을 지우지 않는다)
- 크기 검증(100KB)은 유지
- `FileNotFoundError` 와 "실제 판독 불가"를 구분

---

## 7. 로케일 고정

`FLOW_PROJECT_URL` 환경변수에 **`/en/` 로케일 URL**을 넣어 운용합니다.
셀렉터는 **영어 우선**으로 정리하고, 한국어 후보는 뒤에 폴백으로만 남기세요.
(한/영 동등 유지는 유지보수 비용이 2배가 됩니다.)

시작 시 `page.url` 에 `/en/` 이 없으면 **경고 로그**를 남기세요 (중단까지는 하지 말 것).

---

## 8. `assemble.py` — 단순화 + Round 3 T5

1. `extend_mode` 참조 **전부 삭제**. `n_files = len(scene["files"])` 만 사용 (이미 그렇게 되어 있음 — 확인만)
2. 무결성 assert 유지
3. **T5-A 한글 자막 검증**: `test_r5` 를 **한글 두 줄 자막**으로 다시 돌리고 프레임 PNG 첨부
   ```
   "1996년생, 잠깐 멈추세요.\n10월에 대한 경고입니다"
   ```
   깨지면 `force_style='FontName=Malgun Gothic'` → `맑은 고딕` → `malgun.ttf` 순으로 시도, 통한 방법을 주석에 기록
4. **자막 크기 상향**: `Fontsize 76 → 96`, `Outline 6 → 7`. 변경 전/후 프레임 비교 첨부
5. **T5-B BGM 경로 검증**: 더미 BGM으로 `amix`+`loudnorm` 경로 실행, `loudnorm=print_format=summary` 출력 첨부

---

## 9. 하지 말 것

- ❌ **업로드 자동화 기능을 만들지 마세요.** YouTube/TikTok API 업로드는 **절대 금지**입니다.
  생성·조립까지 무인, **발행은 반드시 사람.** (AI 채널 대량 종료의 공통 사유가 "publishing까지 자동"이었습니다.)
- ❌ `.gitignore` 를 건드리지 마세요 (개발총괄이 관리 중). 파일 append 시 **반드시 UTF-8/`\n`**, 쓴 뒤 NUL 바이트 확인.
- ❌ 제품 런타임 코드(`app/`, `components/`, `lib/`, `next.config.ts`, `scripts/`) 변경 금지
- ❌ `scripts/safe_deploy.py` 실행 금지
- ❌ `CONFIG.THROTTLE` 을 6.0 미만으로 낮추지 말 것
- ❌ Phase 0.5로 확인될 항목(F9 다운로드 방식, F6 DOM)을 **추측으로 확정하지 말 것.**
  모르면 "미검증" 주석을 남기고 그대로 두세요

---

## 10. 제출 형식

1. `git diff` **전문**
2. §1~§8 각 항목별 **before/after 코드 블록**
3. 아래 명령의 **실제 출력 전문**
   ```bash
   cd "C:\Users\gmose\OneDrive\바탕 화면\k-destiny\automation"
   python -c "import ast;[ast.parse(open(f,encoding='utf-8').read()) for f in ['flow_rpa.py','credits.py','assemble.py','run_batch.py']];print('문법 OK')"
   cd C:\ && python "C:\...\automation\credits.py"
   cd "C:\...\k-destiny" && git diff --stat
   ```
4. **T1 가드 동작 확인** — `PHASE0_VERIFIED=False` 로 `run_batch.py` 실행 → 생성 전에 그 메시지로 중단되는지 (크롬이 안 떠 있어도 이 메시지가 먼저 나와야 함)
5. **T5-A 한글 자막 프레임 PNG** (폰트 크기 변경 전/후)
6. **T5-B loudnorm summary 출력**
7. `grep -n "extend"` 결과 — **Extend 관련 코드가 전부 사라졌는지** 확인
8. **실행하지 않은 항목은 "미검증"으로 표기**

> 이번 라운드에서 브라우저 실행은 **필요 없습니다**(가드가 막습니다). §8의 조립 검증만 실제로 돌리면 됩니다.
> Phase 0.5 결과가 오면 F9·F6-DOM을 반영하고 `PHASE0_VERIFIED = True` 로 여는 지시를 별도로 내리겠습니다.
