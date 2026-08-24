# Round 3 지시서 — R5·R6·R7·a1~a6 조건부 통과 + 잔여 4건

> 개발총괄(Opus5) 검수 결과: **R5·R6·a1·a2·a4·a5·a6 통과. R7은 절반 통과.**
> 회귀 테스트를 실제로 실행하고 산출물(`test_r5/`)을 남긴 점은 좋았습니다. 이번엔 제가 완성본을
> 직접 ffprobe로 검사하고 프레임을 추출해 자막 타이밍까지 확인했습니다 — **맞았습니다.**
>
> 아래 T1~T5만 처리하면 Phase 0 도착 전까지 할 일이 끝납니다. **전부 브라우저 없이 가능합니다.**
> **모든 응답 한글.**

---

## 검수 통과 내역 (제가 직접 확인한 것)

`test_r5/test_r5_FINAL.mp4` 를 컨테이너로 가져와 검사한 실제 결과:

```
codec_name=h264   width=1080  height=1920  r_frame_rate=30/1
codec_name=aac    sample_rate=48000  channels=2
duration=24.033008
```

`_subs.ass` 자막 타이밍:

```
0:00:00.00 → 0:00:08.00   Scene 1
0:00:08.00 → 0:00:16.00   Scene 2 no extend
0:00:16.00 → 0:00:24.00   Scene 3
```

3s / 11s / 19s 지점 프레임을 추출해 확인 — **각 씬의 자막이 정확한 구간에 나오고 어긋남이 없습니다.**

| 항목 | 판정 | 근거 |
|---|---|---|
| **R5** cumulative에서 `extend:0` 씬 클립 소실 | ✅ 통과 | `download_init = not(cumulative and extend>=1)` 로 extend==0이면 init을 clips에 포함. `manifest.json` 의 `scene_02_00.mp4` 가 실제로 들어갔고 자막 타이밍 무결. `build_from_manifest()` 무결성 assert도 추가됨 |
| **R6** cumulative 재개 시 잘못된 파일 반환 | ✅ 통과 | `_get_expected_files()` 로 "필요한 파일이 실제로 있는가" 판정으로 교체. init 불필요 다운로드도 제거 |
| **R7** 제출 후 실패를 void 처리 | ⚠️ **절반** | try 블록을 제출 경계로 분리하고 `spent_unconfirmed` 도입 → ①②는 통과. **③ 미처리** (T2 참조) |
| **a1** 화질 팝업 대기 / 맨몸 except | ✅ | `asyncio.sleep(0.5)` + `except Exception` |
| **a2** ffprobe 손상 검증 | ✅ 통과 (단 T3 부작용) | 길이 판독 추가 |
| **a3** 세션 만료 상시 감지 | ⚠️ **위험** | 추가됐으나 오검출 가능 (T1 참조) |
| **a4** 기존 alert 오검출 | ✅ 통과 | `snapshot_alerts()` baseline 비교 |
| **a5** `burn_and_mix` 오디오 분기 | ✅ 통과 | `_has_audio()` 분기 |
| **a6** 미검증 셀렉터 표기 | ✅ 통과 | `result_tile` 에 "Phase 0 실측 전 미검증 추측값" 주석 |
| **R1·R2·R3** | ⏸ Phase 0 대기 | 지시대로 손대지 않음. 추측으로 채우지 않은 것 잘했습니다 |
| `.gitignore` | ✅ 재발 없음 | NUL 0바이트. 개발총괄이 `test_r5/` 도 추가해 교체 |

---

## 【T1 · 최우선】 실수로 실행되는 것을 막는 시작 가드를 추가하라

**지금 가장 큰 위험은 코드 결함이 아니라 "이 상태로 실행될 수 있다"는 것입니다.**

R1·R2·R3이 미해결인 채로 `run_batch.py` 가 돌면:

- **R1** — 매번 같은 클립을 다시 다운로드 → 완성본이 한 장면의 반복, 로그는 "성공"
- **R2** — 출력 개수가 2면 생성당 20크레딧 → 장부 2,000 = 실제 4,000, 상한 돌파
- **R3** — 모델이 Quality(100크레딧)로 잡혀도 통과 → 하룻밤에 예산 소진

**요구사항**

1. `CONFIG` 에 플래그를 추가한다.

```python
    # Phase 0(FLOW_UI_FACTS.md) 실측이 끝나고 R1·R2·R3을 반영한 뒤에만 True 로 바꿀 것.
    # False 인 동안에는 실제 생성을 시작하지 않는다 (크레딧·결과물 보호).
    PHASE0_VERIFIED = False
```

2. `connect_browser()` 직후 — **생성이 한 번도 일어나기 전에** — 아래를 넣는다.

```python
if not CONFIG.PHASE0_VERIFIED:
    raise RuntimeError(
        "Phase 0 미검증 상태입니다. 지금 실행하면 (1) 같은 클립이 반복 다운로드되고 "
        "(2) 출력 개수가 2일 경우 크레딧이 2배 소모되며 (3) 잘못된 모델이 선택될 수 있습니다.\n"
        "automation/FLOW_UI_FACTS.md 의 F2·F3·F5·F6 을 채우고 R1·R2·R3 을 반영한 뒤 "
        "CONFIG.PHASE0_VERIFIED = True 로 바꾸세요."
    )
```

3. `flow_rpa.py` 와 `run_batch.py` **양쪽 진입점 모두**에 적용한다.
4. `automation/README.md` 상단에 이 플래그를 **눈에 띄게** 설명한다.

> 이건 "나중에 지우는 임시 코드"가 아니라, **Flow UI가 바뀌어 셀렉터가 깨질 때마다 다시 쓸 안전장치**입니다. 남겨두세요.

---

## 【T2】 R7-③ 미처리 — 크레딧 실측 대조를 실제로 연결하라

`read_credits_ui()` 는 잔액 숫자를 파싱해 **반환하도록 만들어졌지만, 호출부(504·555행)가 반환값을 버립니다.**

```python
await read_credits_ui(page)      # ← 반환값 버려짐
```

`credits.update_state()` 는 이미 `observed_cost` 인자를 받고 불일치 시 경고까지 찍게 돼 있는데,
**아무도 넘겨주지 않아서 죽은 코드**입니다.

**왜 지금 중요한가:** R2(출력 개수 강제)가 미해결이라 **크레딧이 2배 나가도 알 방법이 없습니다.**
UI 잔액 대조가 그걸 잡아낼 **유일한 관측 수단**이고, Phase 0 없이 지금 붙일 수 있습니다.

**요구사항**

1. 생성 **직전** 잔액을 읽어 변수에 담는다 (`before = await read_credits_ui(page)`).
2. 생성 완료 **직후** 다시 읽어 `observed = before - after` 를 계산한다.
3. `credits.update_state(entry_id, "confirmed", observed_cost=observed)` 로 넘긴다.
4. `before` 나 `after` 가 `None`(파싱 실패)이면 `observed_cost` 를 넘기지 않고 **한 번만 경고 로그**를 남긴다. 예외를 던지지 말 것.
5. 초기 클립과 Extend **양쪽 모두** 적용한다.

---

## 【T3】 a3의 세션 감지가 오검출되면 배치 전체가 멈춘다

`_guarded_generation()` 이 **매 생성 전마다** `login_wall` 을 확인하도록 바뀌었습니다. 방향은 맞습니다. 그런데:

```python
"login_wall": [
    'input[type="email"]',
    'text=/Sign in/i',
    'text=/로그인/i'
]
```

`text=/Sign in/i` 는 **페이지 아무 곳의 "Sign in" 텍스트**에 매칭됩니다. Flow의 계정 메뉴·푸터·안내문에 그 단어가 있으면
**모든 생성이 "로그인 세션 만료"로 중단**됩니다. 밤새 한 편도 못 만들고 아침에 로그만 남습니다.

**요구사항 — 세 조건을 AND로 좁혀라**

1. **URL 판정을 1차 근거로**: `page.url` 에 `accounts.google.com` 이 포함되면 세션 만료로 확정
2. 셀렉터는 `input[type="password"]` 로 좁힌다 (`input[type="email"]` 은 Flow 내 다른 입력과 충돌 가능)
3. `text=/Sign in/i` 는 **단독 근거로 쓰지 않는다.** 쓰려면 `button:has-text("Sign in")` 처럼 역할을 제한하고,
   **동시에 프롬프트 입력창이 사라졌는지**까지 확인해 AND 조건으로 만든다
4. 감지 시 로그에 **`page.url` 을 함께 남긴다** (오검출인지 진짜인지 아침에 구분할 수 있게)

---

## 【T4】 a2의 부작용 — ffprobe가 없으면 정상 파일을 전부 삭제한다

`download_result()` 401~412행:

```python
try:
    p = subprocess.run(["ffprobe", ...])
    if not p.stdout.strip() or float(p.stdout.strip()) < 1.0:
        raise ValueError(...)
except Exception as e:
    out_path.unlink(missing_ok=True)
    raise DownloadFailed(f"다운로드 파일 손상(ffprobe 판독 불가): {e}")
```

`ffprobe` 가 PATH에 없으면 `FileNotFoundError` → `except` 가 잡아서 **정상 다운로드 파일을 지우고** 3회 재시도 후 실패합니다.
에러 메시지는 "파일 손상"이라 원인을 완전히 오도합니다. FFmpeg 미설치 환경에서 **파이프라인이 통째로 죽고 원인 파악이 안 됩니다.**

**요구사항**

1. **모듈 최상단에서 `ffprobe` 존재를 1회 확인**한다 (`shutil.which("ffprobe")`).
   없으면 시작 시점에 명확히 알린다: `"ffprobe 없음 — 다운로드 파일 검증을 건너뜁니다. winget install Gyan.FFmpeg 로 설치하세요"`
2. `ffprobe` 가 없으면 **길이 검증을 건너뛴다** (파일을 지우지 않는다). 크기 검증(100KB)은 그대로 수행.
3. `FileNotFoundError` 와 "실제로 판독 불가" 를 **구분해서** 처리한다. 전자는 환경 문제, 후자만 `DownloadFailed`.
4. `import subprocess` / `import shutil` 를 함수 안이 아니라 **파일 상단**으로 옮긴다.

---

## 【T5】 브라우저 없이 지금 할 수 있는 검증 2건을 마무리하라

`test_r5` 는 좋았지만 **두 가지가 빠졌습니다.** 둘 다 브라우저 없이 지금 됩니다.

### T5-A. 한글 자막 렌더 (가장 중요)

`test_r5` 의 caption이 `"Scene 1"` — **영어였습니다.** 그래서 **한글 자막이 □□□ 로 깨지는지 전혀 검증되지 않았습니다.**
Windows + libass + `Malgun Gothic` 조합은 폰트 깨짐이 나는 대표적인 지점입니다.

**요구사항**

1. `test_r5/manifest.json` 의 caption을 **실제 운영에서 쓸 한글**로 바꿔 다시 돌린다.
   반드시 **개행(`\n`)이 들어간 두 줄 자막**으로 (실제 job 형식과 동일):
   ```
   "1996년생, 잠깐 멈추세요.\n10월에 대한 경고입니다"
   ```
2. 완성본에서 **각 씬 구간의 프레임을 PNG로 추출**해 첨부한다.
   ```bat
   ffmpeg -y -ss 3  -i test_r5\test_r5_FINAL.mp4 -frames:v 1 _facts\ko_sub_1.png
   ffmpeg -y -ss 11 -i test_r5\test_r5_FINAL.mp4 -frames:v 1 _facts\ko_sub_2.png
   ```
3. **한글이 □□□ 로 깨지면** 다음 순서로 해결한다.
   - ASS `Fontname` 을 `맑은 고딕` (한글 이름)으로 시도
   - `fontsdir` 대신 `subtitles=...:force_style='FontName=Malgun Gothic'` 사용
   - 그래도 안 되면 `FONT` 를 `C:/Windows/Fonts/malgun.ttf`(Bold 아닌 것)로 바꾸고 스타일 Bold=1 유지
   - 어느 방법이 통했는지 코드 주석에 남긴다
4. **참고(개선 제안):** 현재 `Fontsize = 76` 은 1080×1920 숏폼 기준으로 **작습니다.**
   프레임을 추출해 보니 화면에서 눈에 확 들어오지 않습니다. **`92~104` 범위로 올리고**,
   `Outline` 도 `6 → 7` 로 키워 시청 환경(작은 화면·밝은 배경)에서의 가독성을 확보하세요.
   변경 후 프레임을 다시 뽑아 비교 이미지를 첨부하세요.

### T5-B. BGM 믹스 경로

`test_r5` 는 `bgm` 필드가 없어서 **`else` 분기(자막만)** 만 실행됐습니다.
즉 **`amix` + `loudnorm` 경로와 a5의 무음 분기는 한 번도 돌지 않았습니다.**

**요구사항**

1. 더미 BGM을 만든다.
   ```bat
   ffmpeg -y -f lavfi -i "sine=frequency=220:duration=30" -c:a libmp3lame _facts\dummy_bgm.mp3
   ```
2. `manifest.json` 에 `"bgm": "<그 경로>"` 를 넣고 다시 돌린다.
3. 완성본의 **라우드니스를 측정해 첨부**한다 (목표 -14 LUFS 근처).
   ```bat
   ffmpeg -i test_r5\test_r5_FINAL.mp4 -af loudnorm=print_format=summary -f null -
   ```
   → 출력의 `Output Integrated` 값을 보고한다.
4. `-shortest` 때문에 **BGM이 영상보다 짧을 때 영상이 잘리지 않는지** 확인한다.
   (BGM 5초 / 영상 24초 로도 한 번 돌려보고 완성본 길이가 24초 유지되는지)
   잘린다면 `-stream_loop -1` 이 제대로 동작하지 않는 것이므로 `apad` 추가를 검토한다.

---

## 제출 형식

1. T1~T5 각각 **변경 코드 before/after**
2. `git diff --stat`
3. **T5-A 한글 자막 프레임 PNG** (폰트 크기 변경 전/후 2장)
4. **T5-B loudnorm summary 출력 전문**
5. `python -c "import ast;[ast.parse(open(f,encoding='utf-8').read()) for f in ['flow_rpa.py','credits.py','assemble.py','run_batch.py']];print('문법 OK')"`
6. **T1 가드 동작 확인**: `PHASE0_VERIFIED=False` 상태로 `python run_batch.py jobs/sample_master_warning.json` 실행 →
   **생성이 시작되기 전에 위 메시지로 중단**되는지 (전용 크롬이 안 떠 있어도 CDP 연결 에러가 아니라 이 메시지가 먼저 나오도록 순서를 맞추세요)

> **실행하지 않은 항목은 "미검증"으로 표기.** 지난 라운드에서 이 부분이 개선됐습니다 — 계속 유지하세요.
> T1~T5가 끝나면 Phase 0 데이터가 올 때까지 **더 할 일이 없습니다.** 대기하세요.
