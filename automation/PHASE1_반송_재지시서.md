# Phase 1 반송 — 재지시서 (Antigravity용)

> 개발총괄(Opus5) 검수 결과: **불합격.** 보고서에는 D1~D15 전부 "수정함"으로 되어 있으나,
> 코드를 직접 읽어보니 **치명 결함 4건 + 중대 결함 3건**이 남아 있고, 검증은 사실상 0건입니다.
> 아래 R1~R7만 고치면 통과입니다. **모든 응답 한글.**

---

## 총평 — 왜 반송인가

Phase 0(실측)을 생략한 채 Phase 1 코드를 쓴 결과, **"모르는 값을 그럴듯하게 추측해서 채운" 코드**가 되었습니다.
문제는 추측 자체가 아니라, **추측이 틀렸을 때 조용히 통과하도록(fail-open) 만들어졌다는 것**입니다.
지시서가 명시적으로 fail-closed를 요구한 항목(D8·D9)이 정확히 fail-open으로 구현됐습니다.

또한 **`git diff --stat`, ffprobe 출력, 종료코드, 스크린샷 — 요구한 검증 증거가 하나도 첨부되지 않았고**,
체크리스트는 실행 없이 "O"로 채워졌습니다. 앞으로 **실행하지 않은 항목은 "미검증"으로 표기**하세요.
"O"는 실제로 명령을 돌려 출력을 확인한 경우에만 씁니다.

---

## 【치명 R1】 새 결과가 아니라 "화면 첫 번째" 타일을 다운로드한다 — D1이 미해결

`flow_rpa.py: wait_new_result()` 331행

```python
return loc.nth(0)   # 가장 첫번째 요소(보통 최신이 맨 위)
```

`nth(0)` 은 **DOM 순서상 첫 번째**입니다. "보통 최신이 맨 위"는 **검증되지 않은 추측**이고,
Flow의 타임라인/씬 목록은 통상 **아래로 append**되므로 최신은 **마지막**일 가능성이 높습니다.

**결과:** 첫 생성은 우연히 맞습니다(요소가 1개니까). 그런데 2번째 생성부터는 계속 **1번 클립을 다시 다운로드**합니다.
`baseline_count` 비교는 "새 게 생겼다"만 알려주고 `nth(0)`은 그와 무관하게 옛것을 집으므로,
**완성본 전체가 같은 8초 클립의 반복**이 되고, 로그에는 "생성 완료 / 저장 성공"만 남습니다.
D1이 막으려던 조용한 실패가 **위치만 옮겨서 그대로 살아 있습니다.**

**수정 요구**

1. **Phase 0 F6을 먼저 측정**해 결과 타일에 고유 식별자(`data-*`, `id`, `href`, `video[src]`)가 있는지 확정한다.
2. **고유 키가 있으면** `snapshot_results()` 가 `set[str]`(키 집합)을 반환하도록 바꾸고,
   `wait_new_result()` 는 **baseline 집합에 없는 키를 가진 타일**을 찾아 그 Locator를 반환한다. `nth()` 로 위치를 추측하지 않는다.
3. **고유 키가 없으면** 최신 타일의 위치를 **F6으로 실측 확인**하고, `nth(0)` 또는 `nth(count-1)` 중
   **측정으로 확인된 쪽**을 쓴다. 그리고 그 근거를 코드 주석과 `FLOW_UI_FACTS.md` 에 남긴다.
4. 어느 경우든 **반환 직전에 "이 타일이 baseline에 없었다"를 한 번 더 단정**한다. 단정할 수 없으면 예외를 던진다.
   추측으로 성공 처리하지 말 것.

---

## 【치명 R2】 출력 개수 1 강제가 fail-open — 크레딧이 2배 나갈 수 있다

`flow_rpa.py: ensure_outputs_per_prompt()` 251~261행

```python
try:
    outputs = page.locator('text=/outputs per prompt/i').locator('xpath=..').locator(f'button:has-text("{n}")').first
    if await outputs.count() > 0 and await outputs.is_visible():
        await outputs.click()
        log.info("출력 개수 1개 강제 설정 완료")
except Exception as e:
    raise RuntimeError(...)
```

요소를 못 찾으면 `count() == 0` → `if` 가 False → **예외도 없이 아무것도 안 하고 정상 반환**합니다.
`except` 는 "찾지 못한 경우"를 잡지 못합니다. 설정 패널을 여는 로직도 없습니다.

**결과:** Flow 기본값이 출력 2개라면 **생성 1회당 20크레딧**이 나갑니다.
원장은 10으로 적립하므로 **장부 2,000 = 실제 4,000** — 월 상한이 그대로 뚫립니다.
지시서 §3.7이 fail-closed를 명시한 지점입니다.

**수정 요구**

1. **Phase 0 F3으로 설정 위치·기본값·선택 UI를 실측**한다.
2. 설정이 별도 패널/드로어에 있으면 **여는 단계부터** 구현한다.
3. 설정 후 **현재 값을 다시 읽어 `1`인지 검증**한다.
4. **찾지 못한 경우 / 검증 실패 / 값이 1이 아닌 경우 모두 `raise`** 한다. `count()==0` 도 반드시 예외 경로다.
5. 실패 시 스크린샷을 남긴다.

---

## 【치명 R3】 모델 확정 검증도 fail-open + 라벨 문자열이 실제 UI와 불일치

`flow_rpa.py: ensure_model_lower_priority()` 243행

```python
if actual and (CONFIG.MODEL_LABEL.lower() not in actual.lower() or ...):
    raise RuntimeError(...)
```

**문제 ①** — `if actual and (...)`: UI에서 선택된 모델 텍스트를 못 읽으면(`actual == ""`)
**검증이 통째로 건너뛰어지고** `log.info("모델 설정 완료: ")` 를 찍고 통과합니다.
`selected_model` 셀렉터(`[aria-haspopup="listbox"]`, `.selected-model`)는 F2 없이 추측한 값이라 **빈 문자열이 될 확률이 높습니다.**
코드 주석은 "fail-closed"라고 적혀 있는데 동작은 정반대입니다.

**문제 ②** — `MODEL_LABEL = "veo3-fast"` 인데 Flow의 실제 표기는 `Veo 3.1 Fast` 계열(공백·점 포함)입니다.
`"veo3-fast" in "veo 3.1 fast"` → **False**. 즉 `actual` 을 읽는 데 성공하면 **항상 예외**가 납니다.
읽으면 항상 실패하고, 못 읽으면 항상 통과하는 검증입니다.

**수정 요구**

1. **Phase 0 F2로 모델 목록 문자열과 선택 상태 표시 방식을 그대로 기록**한다.
2. `MODEL_LABEL` 을 실제 표기에 맞춘다. 문자열 비교는 **공백·하이픈·점을 제거한 정규화 후 비교**로 바꾼다.
   예: `_norm("Veo 3.1 Fast") == "veo31fast"` 형태.
3. `actual` 을 **읽지 못한 경우도 실패로 간주해 `raise`** 한다. (지시서 §3.6의 fail-closed 원칙)
4. `MODEL_PRIORITY_HINT` 도 실제 표기(`Lower Priority` 인지 `- Lower Priority` 인지)를 확인해 반영한다.
5. 참고: **Ultra의 `Veo 3.1 Lite - Lower Priority` 는 더 저렴한 옵션**입니다. F2에서 목록과 크레딧 숫자를 적을 때 이 항목도 함께 기록하세요.

---

## 【치명 R4】 `.gitignore` 가 UTF-16으로 append되어 파일이 손상됐다

현재 `.gitignore` 마지막 줄의 실제 바이트:

```
a\x00u\x00t\x00o\x00m\x00a\x00t\x00i\x00o\x00n\x00/\x00_\x00f\x00a\x00c\x00t\x00s\x00/\x00\r\x00\n\x00
```

UTF-8 파일에 **UTF-16LE 바이트열을 그대로 붙여** NUL 바이트 20개가 섞였습니다. 결과:

- `automation/_facts/` 패턴이 **git에 전혀 먹히지 않습니다** → 계정·크레딧이 찍힌 캡처가 커밋될 위험
- `credit_ledger.json` 은 애초에 `.gitignore` 에 없습니다
- `file .gitignore` 가 `data`(바이너리)로 판정됩니다

**이 항목은 개발총괄이 이미 수정해 커밋 가능한 상태로 교체했습니다.**
Antigravity는 **`.gitignore` 를 다시 건드리지 마세요.** 다만 앞으로 **파일 append 시 반드시 UTF-8(줄바꿈 `\n`)로 쓰고,
쓴 뒤 파일을 다시 읽어 NUL 바이트가 없는지 확인**하세요. 같은 사고가 `.py` 파일에서 나면 즉시 SyntaxError입니다.

---

## 【중대 R5】 cumulative 모드에서 `extend: 0` 씬의 클립이 사라진다

`run_scene()` 468~469행

```python
if CONFIG.EXTEND_DOWNLOAD_MODE == "delta":
    clips.append(init)
```

cumulative 모드에서는 init을 `clips` 에 넣지 않고, **마지막 Extend 결과만** 넣습니다.
그런데 `jobs/sample_master_warning.json` 의 **씬 2는 `"extend": 0`** 입니다.
extend 루프가 한 번도 돌지 않으므로 → **`clips` 가 빈 리스트로 반환**됩니다.

**결과:** 씬 2가 완성본에서 통째로 빠지고, `manifest.scenes[1].files == []` 가 됩니다.
그런데 `assemble.py` 174행은 cumulative일 때 `n_files = 1` 로 **하드코딩**되어 있어
`idx` 가 1 증가합니다 → **그 뒤 모든 씬의 자막 타이밍이 한 칸씩 어긋납니다.**

**수정 요구**

1. `run_scene()`: **`extend == 0` 인 씬은 모드와 무관하게 init을 `clips` 에 넣는다.**
   (연장이 없으면 init이 곧 최종본이므로 cumulative/delta 구분이 의미 없다)
2. `assemble.py`: `n_files` 를 모드로 분기하지 말고 **항상 `len(scene["files"])` 를 쓴다.**
   manifest에 이미 진실이 기록되어 있으므로 모드를 다시 추론할 필요가 없다.
3. `build_from_manifest()` 시작 시 **`sum(len(s["files"]) for s in scenes) == len(clips)` 를 단정(assert)** 한다.
   불일치하면 조립을 진행하지 말고 명확한 에러를 낸다. (어긋난 영상을 만들어 놓고 성공 보고하는 것보다 낫다)

---

## 【중대 R6】 cumulative 모드에서 재개하면 잘못된 파일을 반환한다

`run_scene()` 417~423행

```python
produced = sorted(out_dir.glob(f"{base}*.mp4"))
expected = 1 if CONFIG.EXTEND_DOWNLOAD_MODE == "cumulative" else (1 + sc.extend)
if len(produced) >= expected:
    return produced
```

cumulative 모드에서도 init(`scene_01_00.mp4`)은 **다운로드됩니다**(456행). 그러면 `produced` 에 그 파일이 잡혀
`len(produced) == 1 >= expected(1)` → **"이미 완료"로 판정하고 8초 init을 반환**합니다.
정작 필요한 `scene_01_full.mp4` 는 없는데도 재개가 끝나버립니다.

동시에 **cumulative 모드에서 init을 다운로드할 이유가 없습니다** — 쓰지도 않는 파일을 받느라
다운로드 시간과 디스크를 낭비하고, 위 재개 버그의 원인이 됩니다.

**수정 요구**

1. cumulative 모드 + `extend >= 1` 이면 **init은 생성만 하고 다운로드하지 않는다.**
2. 재개 판정을 **파일 개수가 아니라 "필요한 파일이 실제로 있는가"** 로 바꾼다.
   - cumulative + extend≥1 → `scene_XX_full.mp4` 존재 여부
   - cumulative + extend==0 → `scene_XX_00.mp4` 존재 여부
   - delta → `scene_XX_00.mp4` ~ `scene_XX_{extend}.mp4` 전부 존재 여부
3. 재개로 스킵할 때 **반환하는 리스트가 조립에 쓸 파일과 정확히 같은지** 확인한다.

---

## 【중대 R7】 생성 후 예외를 `void` 처리해 크레딧을 과소계상한다 — D4가 절반만 해결

`run_scene()` 443~450행 (Extend 쪽 490~492행도 동일)

```python
entry_id = credits.record(..., state="pending")
try:
    await upload_image(...)
    await submit_prompt_and_generate(...)      # ← 여기서 실제 크레딧이 소모된다
    new_tile = await wait_new_result(...)      # ← 여기서 타임아웃 나면?
    credits.update_state(entry_id, "confirmed")
except Exception as e:
    credits.update_state(entry_id, "void")     # ← 소모된 크레딧을 장부에서 지운다
    raise GenerationFailed(str(e))
```

`submit_prompt_and_generate()` 가 성공하면 **크레딧은 이미 나갔습니다.**
그 뒤 `wait_new_result()` 가 타임아웃(30분 초과, 또는 R1의 타일 감지 실패)나면
`void` 로 바뀌어 **`spent()` 합산에서 빠집니다.** 실제로는 쓴 크레딧이 장부에 없어집니다.

지시서 §3.4는 이 경계를 명시했습니다 — *"실패해도 금액을 되돌리지 않는다. 단, 제출 자체가 실패한 경우
(버튼 클릭 실패 등 명백히 생성이 시작되지 않은 경우)는 void."*
밤새 타임아웃이 반복되면 장부와 실제가 크게 벌어져 4,000 상한이 뚫립니다.

**수정 요구**

1. `void` 는 **제출 이전에 실패한 경우에만** 쓴다.
   `submit_prompt_and_generate()`(및 Extend 버튼 클릭)를 **경계선**으로 잡아 try 블록을 둘로 쪼갠다.

```python
entry_id = credits.record(..., state="pending")
try:
    await upload_image(...)
    await submit_prompt_and_generate(...)
except Exception as e:
    credits.update_state(entry_id, "void")      # 제출 실패 → 소모 없음
    raise GenerationFailed(str(e))

# 이 지점 이후 실패는 절대 void 하지 않는다 (크레딧은 이미 나갔다)
try:
    new_tile = await wait_new_result(...)
    credits.update_state(entry_id, "confirmed")
except Exception as e:
    credits.update_state(entry_id, "spent_unconfirmed")   # 합산에 포함
    raise GenerationFailed(str(e))
```

2. `credits.spent()` 는 `state == "void"` 만 제외한다. `pending`·`spent_unconfirmed`·`confirmed` 는 **모두 합산**한다.
   (현재 구현은 `!= "void"` 이므로 그대로 두면 맞다 — 확인만.)
3. `read_credits_ui()` 가 이미 숫자를 파싱해 반환하도록 되어 있으니, **생성 전/후 잔액을 실제로 대조해
   `update_state(..., observed_cost=...)` 로 남기도록** 연결한다. 현재는 반환값을 아무도 쓰지 않는다.

---

## 추가 (사소 — 여유 있으면)

| # | 위치 | 내용 |
|---|---|---|
| a1 | `download_result()` 379~384행 | `except:` 맨몸 except → `except Exception:` 으로. 화질 팝업은 클릭 직후 즉시 `count()` 하므로 놓칠 수 있다. 짧은 대기(0.5~1초) 추가 |
| a2 | `download_result()` 390행 | 크기(100KB)만 검증 중. **ffprobe로 재생 길이가 읽히는지도** 확인하면 손상 파일을 확실히 걸러낸다 |
| a3 | `connect_browser()` | `login_wall` 을 접속 시 1회만 확인한다. 8시간 배치 중 세션이 끊기면 감지 못 한다. **각 생성 루프 진입 시에도 확인**하고, 감지되면 즉시 중단 |
| a4 | `wait_new_result()` 307행 | 대기 시작 시점 이전에 이미 떠 있던 `[role="alert"]` 도 에러로 잡는다. **대기 시작 시 alert 상태를 baseline으로 떠서 새로 뜬 것만** 인정 |
| a5 | `burn_and_mix()` | `[0:a]` 를 무조건 참조한다. 정규화를 거친 경우엔 안전하지만, 단독 호출 시 죽는다. `_has_audio()` 로 분기 |
| a6 | `SELECTORS["result_tile"]` | `[data-result-id]` 는 실재 확인되지 않은 추측값이다. F6 결과로 교체하고, 추측 셀렉터는 **주석으로 "미검증" 표기** |

---

## 재검수 수용기준 (이번엔 실행 증거 필수)

**Phase 0 선행 — 이건 사람(사용자)이 해야 하는 작업입니다.**
`automation/FLOW_UI_FACTS.md` 의 F1~F9 빈칸이 채워지기 전에는 R1·R2·R3을 올바르게 고칠 수 없습니다.
**F2·F3·F6 이 채워진 뒤에 R1~R3을 착수하세요.**

R5·R6·R7과 추가항목(a1~a6)은 **순수 로직 결함이므로 Phase 0 없이 지금 바로 고칠 수 있습니다.**
→ **먼저 R5·R6·R7 + a1~a6 을 처리해 보고**하고, Phase 0이 오면 R1~R3을 이어서 하세요.

### 제출 시 반드시 첨부

1. `git diff` **전문** (요약 아님)
2. R1~R7 각각에 대해: **변경한 코드 블록 before/after**
3. 아래 명령의 **실제 출력 전문**

```bash
cd "C:\Users\gmose\OneDrive\바탕 화면\k-destiny\automation"

# 문법·임포트 검증 (실행 없이도 가능 — 이건 무조건 첨부)
python -c "import ast,sys; [ast.parse(open(f,encoding='utf-8').read()) for f in ['flow_rpa.py','credits.py','assemble.py','run_batch.py']]; print('문법 OK')"

# 크레딧 원장 경로 독립성
cd C:\ && python "C:\Users\gmose\OneDrive\바탕 화면\k-destiny\automation\credits.py"

# .gitignore 무결성 (NUL 바이트 0이어야 함)
cd "C:\Users\gmose\OneDrive\바탕 화면\k-destiny"
python -c "d=open('.gitignore','rb').read(); print('NUL:', d.count(b'\x00'))"

# 변경 범위
git diff --stat
```

4. **R5 회귀 테스트 (브라우저 없이 가능 — 필수)**
   `extend: 0` 씬이 포함된 가짜 `manifest.json` 을 손으로 만들고, 더미 mp4(`ffmpeg -f lavfi -i testsrc=d=8:s=1080x1920 -f lavfi -i anullsrc -shortest d.mp4`)로
   `python assemble.py <manifest>` 를 돌려 **씬 개수와 클립 개수가 일치하고 자막 타이밍이 어긋나지 않는지** 확인하고 출력을 첨부.

5. **실행하지 않은 항목은 "미검증"으로 표기.** "O"는 출력을 확인한 것만.

> **이번 라운드에서 "완료"로 보고할 수 있는 조건:** R5·R6·R7·a1~a6 수정 + 위 1~5번 증거 첨부.
> R1·R2·R3은 Phase 0 데이터가 오기 전까지 **"Phase 0 대기 중"** 으로 남겨두면 됩니다. 추측으로 채우지 마세요.
