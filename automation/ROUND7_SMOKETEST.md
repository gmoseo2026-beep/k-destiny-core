# R6 검수 통과 + Round 7 — 실전 1씬 스모크 테스트

**검수:** 개발총괄(Opus5) · 2026-07-27
**판정:** **R6 통과.** 치명 3건·중대 4건 전부 올바르게 반영됐습니다.
**다음:** 잔여 경미 3건을 고치고 → **실제 1씬 생성(10크레딧)** 으로 갑니다.

---

## 1. R6 검수 결과 — 통과

제가 코드를 직접 읽어 확인한 것:

| 항목 | 확인 방법 | 결과 |
|---|---|---|
| 【치명A】 KeyError | `grep -c "snapshot_alerts\|generating_indicator\|error_toast\|items.first.click"` → **0** | ✅ |
| 【치명B】 패널 미개방 | `ensure_flow_settings()` 신설, `settings_open` 클릭 → `VIDEO_SECTION` 존재 검증 | ✅ |
| 【치명C】 씬별 모델 재검증 | `run_scene` 에서 제거, `run_job` 시작 시 `ensure_flow_settings()` 로 대체 | ✅ |
| 【중대D】 자동승인 | `ensure_auto_approve()` — `aria-checked` 검증 후 실패 시 raise | ✅ |
| 【중대E】 화질 fallback | `items.first.click()` 삭제, 서브메뉴 스코프(`[role="menu"].last`) | ✅ |
| 【중대F】 서브메뉴 대기 | `[role="menu"]` 개수 ≥2 를 최대 4초 폴링 | ✅ |
| 【중대G】 Save | 클릭하지 않고 "미검증" 주석 | ✅ |
| 에이전트 패턴 | 영어 3종(`use ... instead`, `switch to`, `currently unavailable`) 추가 | ✅ |
| `wait_new_result` | `data-tile-id` 집합 차분만으로 판정, 스피너 의존 제거 | ✅ 깔끔합니다 |

`ensure_flow_settings()` 의 finally 블록에서 Escape → 안 닫히면 Settings 재클릭 → 프롬프트창 가시성 확인까지 3단으로 짠 것, 좋습니다.

---

## 2. 남은 경미 3건 (실전 테스트 전에 같이 고치세요)

### 【경미 1】 화질이 항상 **720p** 로 뽑힙니다 — 1080p 우선으로

서브메뉴 DOM 순서는 `270p → 720p → 1080p → 4K` 입니다. 그런데 루프가:

```python
if first_line in ("1080p", "720p"):
    await it.click(); picked = first_line; break
```

**720p 를 먼저 만나 break** 합니다. 1080p 에 도달하지 않습니다.

720p 도 동작은 하지만 "Original Size"(원본 720p)라 최종 1080×1920으로 올릴 때 ffmpeg 업스케일에 의존합니다.
Google 의 업스케일(1080p, 추가 크레딧 없음)이 더 낫습니다.

**수정 — 2패스로:**

```python
        # 1패스: 1080p 우선 / 2패스: 720p 폴백
        picked = None
        for want in ("1080p", "720p"):
            for i in range(await items.count()):
                it = items.nth(i)
                first_line = (await it.inner_text()).strip().split("\n")[0].strip()
                if first_line in CONFIG.QUALITY_FORBIDDEN:      # 4K = 50크레딧
                    continue
                if first_line == want:
                    await it.click(); picked = want; break
            if picked:
                break
        if not picked:
            raise DownloadFailed("화질 항목(1080p/720p)을 찾지 못함")
        log.info("  화질 선택: %s", picked)
```

### 【경미 2】 `/en/` 로케일 경고가 항상 뜹니다 — 실측과 불일치

```python
if "/en/" not in (page.url or ""):
    log.warning("로케일이 '/en/'이 아닙니다...")
```

**실제 URL에는 로케일 세그먼트가 아예 없습니다** — `labs.google/fx/tools/flow/project/<uuid>`.
제가 브라우저에서 직접 확인했고, 그 상태에서 **UI는 이미 영어**였습니다.

→ 이 경고문을 **삭제**하세요. 매 실행마다 뜨는 가짜 경고는 진짜 문제를 가립니다.

대신 **UI 언어를 실제로 확인**하려면 이렇게 하세요(선택):

```python
    # UI가 영어인지 확인 (셀렉터가 영어 텍스트 기반이므로)
    if await page.locator('button:has-text("Settings")').count() == 0:
        log.warning("영어 UI가 아닐 수 있습니다 — 셀렉터 매칭 실패 가능. (url=%s)", page.url)
```

### 【경미 3】 `read_credits_ui` 의 다이얼로그가 안 닫히면 프롬프트를 가립니다

`read_credits_ui()` 는 예외를 삼키고 `None` 을 반환합니다. 그런데 **Escape 가 안 먹으면 다이얼로그가 화면에 남고**,
바로 다음에 오는 `run_scene → submit_prompt_and_generate` 가 프롬프트창을 못 찾아 실패합니다.

**수정 — 닫힘을 확인하세요:**

```python
async def read_credits_ui(page):
    val = None
    try:
        await page.locator(CONFIG.SELECTORS["profile_open"][0]).first.click()
        await asyncio.sleep(1.2)
        txt = await page.locator(CONFIG.SELECTORS["credit_text"][0]).first.inner_text()
        m = re.search(r'([\d,]+)', txt)
        val = float(m.group(1).replace(',', '')) if m else None
    except Exception:
        pass
    # 닫힘 보장 — 최대 3회
    for _ in range(3):
        try:
            if await page.locator('[role="dialog"][data-state="open"]').count() == 0:
                break
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.5)
        except Exception:
            break
    return val
```

---

## 3. ★ 실전 스모크 테스트용 job — **1씬만, 10크레딧**

첫 실행부터 3씬(30크레딧)을 돌리지 마세요. **1씬으로 전 구간을 한 번 통과**시키는 게 먼저입니다.

`automation/jobs/smoke_1scene.json` 을 아래 내용으로 **새로 만드세요.**

```json
{
  "video_id": "smoke_1scene",
  "output_dir": "C:\\kd\\out",
  "bgm": "",
  "title_ko": "스모크 테스트 (1씬)",
  "scenes": [
    {
      "n": 1,
      "prompt": "Animate this portrait: a dark, elegant Korean female fortune-teller looks directly into the camera with a calm but serious expression, a slow blink, then the faintest tilt of the head. Candlelight flickers, drifting gold embers, faint purple-gold mystical glow. Cinematic, 9:16 vertical. Her mouth stays closed, lips still, she does not speak, no dialogue, no lip movement, no talking. Ambient sound only, no speech, no music. No text, no captions, no subtitles, no watermark.",
      "ref_image": "C:\\Users\\gmose\\OneDrive\\바탕 화면\\k-destiny\\public\\images\\master_karma_calm.webp.jpg",
      "caption": "1996년생, 잠깐 멈추세요.\n10월에 대한 경고입니다"
    }
  ]
}
```

**이 프롬프트에 담긴 것 (전부 의도된 것이니 지우지 마세요):**

| 문구 | 이유 |
|---|---|
| `mouth stays closed, lips still, does not speak, no dialogue, no lip movement` | **립싱크 함정 방어.** 외부 TTS 음성과 입 모양이 안 맞으면 "싸구려 AI 영상"으로 낙인찍힙니다 |
| `ambient sound only, no speech, no music` | Veo 자체 오디오가 VO와 겹치는 것 방지 (앰비언스만 볼륨 0.12로 씀) |
| `no text, no captions, no subtitles` | Veo가 화면에 자막을 구워버리는 알려진 실패 모드 방어 |
| **영어 프롬프트** | 에이전트가 **프롬프트 언어로 답합니다.** 영어로 넣어야 에이전트도 영어로 답하고, 블로킹 패턴을 영어 위주로 관리할 수 있습니다 |

> 기존 `jobs/sample_master_warning.json` 은 Extend 시절 구조(`"extend": 1`)에 한국어 프롬프트라
> **더 이상 쓰지 마세요.** `_legacy/` 로 옮기거나 지우세요.

---

## 4. 스모크 테스트 실행 절차 (사용자님)

### ① 사전 준비

```bat
:: 1. 전용 크롬 (평소 크롬과 분리)
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\kd\chrome-profile"
```

그 창에서 → Google 로그인 → **K-Destiny 자동화 프로젝트 열기** → URL 복사

```bat
:: 2. 출력 폴더
mkdir C:\kd\out

:: 3. 환경변수
cd "C:\Users\gmose\OneDrive\바탕 화면\k-destiny\automation"
set CDP_PORT=9222
set FLOW_PROJECT_URL=https://labs.google/fx/tools/flow/project/8f8c4126-99bb-4477-9e21-9494dbc9673e
```

### ② 가드 열기

`flow_rpa.py` 의 `CONFIG.PHASE0_VERIFIED` 를 **`True`** 로 변경.

### ③ 실행 — **화면을 보고 계세요**

```bat
python run_batch.py jobs/smoke_1scene.json
```

**첫 실행은 무인으로 두지 마세요.** 옆에서 보면서 아래를 확인하세요.

| 단계 | 화면에서 보일 것 | 로그에서 보일 것 |
|---|---|---|
| 1 | Agent settings 패널이 **열렸다 닫힘** | `자동 승인(Never) 확인됨` / `모델 설정 완료: Veo 3.1 - Lite` / `출력 개수 강제 설정 완료` |
| 2 | 프로필 다이얼로그가 **열렸다 닫힘** | — |
| 3 | 프롬프트가 입력되고 전송됨 | `프롬프트 전송 & 생성 시작(NNN자)` |
| 4 | 에이전트가 영어로 답하고 큐 대기 | (조용히 폴링) |
| 5 | 갤러리 **왼쪽에 새 타일** 등장 | `생성 완료 (새 타일 발견: fe_id_...)` |
| 6 | 타일 hover → 메뉴 → 다운로드 | `화질 선택: 1080p` / `저장: scene_01.mp4` |
| 7 | FFmpeg 조립 | `✅ 완성: ...smoke_1scene_FINAL.mp4` |

### ④ 결과 확인

```bat
:: 크레딧이 정확히 10 줄었는지
python credits.py

:: 완성본 규격
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate ^
  -show_entries format=duration -of default=nw=1 C:\kd\out\smoke_1scene\smoke_1scene_FINAL.mp4
```

**그리고 완성본을 직접 재생해서 이 4가지를 보세요:**

1. **마스터의 입이 움직이지 않는가** ← 립싱크 방어가 먹혔는지
2. **화면에 Veo가 만든 자막이 구워져 있지 않은가**
3. 한글 자막이 정상 렌더되는가
4. 1080×1920 / 약 8초

### ⑤ 실패하면

- **로그의 마지막 에러 메시지**와 `automation/flow_run.log` 를 저에게 주세요
- 실패 스크린샷이 `C:\kd\out\smoke_1scene\_err_scene_01_t*.png` 에 남습니다
- `credit_ledger.json` 도 확인 — `spent_unconfirmed` 항목이 있으면 크레딧은 나갔는데 결과를 못 받은 것

> **가장 가능성 높은 실패 지점 3곳:** ①설정 패널 개폐, ②타일 hover→메뉴, ③다운로드 서브메뉴.
> 전부 실제로 돌려봐야 알 수 있는 구간입니다. 한 번에 통과하면 운이 좋은 겁니다.

---

## 5. 스모크 통과 후

1. **3씬 테스트** — 같은 구조로 씬 3개(30크레딧) → 24초 완성본
2. **VO 통합 (Phase 4)** — ElevenLabs Voice ID 받으면 제가 지시서 작성
   - `tts.py` + `casting.json`
   - `assemble.py` 다국어 조립 (`_KO_FINAL.mp4` / `_EN_FINAL.mp4`)
   - job JSON 다국어 스키마 (`vo`/`subs` 언어별 딕셔너리)
3. **Phase 5** — `make_jobs.py` (초안 생성 → 사람 검수 구조)
4. **야간 하드닝 (Phase 3)** — `powercfg` 절전 방지 + 작업 스케줄러 등록

---

## 제출 형식 (Antigravity)

1. 경미 1~3 각각 before/after
2. `jobs/smoke_1scene.json` 생성 확인 + `jobs/sample_master_warning.json` 을 `_legacy/` 로 이동
3. `python -c "import ast;[ast.parse(open(f,encoding='utf-8').read()) for f in ['flow_rpa.py','credits.py','assemble.py','run_batch.py']];print('문법 OK')"`
4. `git diff --stat`
5. **`PHASE0_VERIFIED` 는 `False` 로 그대로 두세요.** 사용자가 직접 열고 실행합니다
