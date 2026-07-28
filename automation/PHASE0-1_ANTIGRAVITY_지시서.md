# K-Destiny 영상 파이프라인 — Antigravity 작업지시서 (Phase 0 + Phase 1)

> 발행: 개발총괄(Opus5) → 구현(Antigravity / Gemini 3.1 Pro)
> 작업 폴더: 로컬 `k-destiny` · 대상 디렉터리: **`automation/` 전용**
> **모든 응답·주석·커밋메시지·문서는 한글.**

---

## 0. 착수 전 필독

**반드시 먼저 읽을 파일 (전문):**

1. `GEMINI.md` — 보안·배포 절대 규칙
2. `skill.md` §5 (보안 규칙), §6 (AI 라우트 안정성)
3. `AGENTS.md`
4. `automation/README.md`
5. `automation/flow_rpa.py`
6. `automation/credits.py`
7. `automation/assemble.py`
8. `automation/run_batch.py`
9. `automation/jobs/sample_master_warning.json`

**절대 건드리지 말 것:**

- 제품 런타임 코드 전체 — `app/`, `components/`, `lib/`, `i18n/`, `messages/`, `prisma/`, `middleware.ts`, `next.config.ts`
- 배포 스크립트 — `scripts/`
- **이번 Phase에서는 `python scripts/safe_deploy.py` 를 실행하지 않는다.** 이 작업은 사이트 배포와 무관하다.
- `assemble.py` 의 자막 고도화(타임드 자막) — Phase 4 범위. Phase 1에서는 **D10(무음 클립) 방어만** 손댄다.
- `templates/`, `make_jobs.py` — Phase 5 범위. 만들지 말 것.

**보안 규칙 (위반 시 즉시 중단·수정):**

- 비밀(API키·비번·토큰·SSH키)을 커밋되는 파일에 하드코딩 금지
- `.env`, `.env.local`, `scripts/deploy.env` 커밋 금지
- 커밋 전 스테이징 diff 스캔: `sk-`, `password=`, `DEPLOY_PASS=`, `chltnrud`, `BEGIN ... PRIVATE KEY`
- 훅 활성화 확인: `git config core.hooksPath scripts/hooks`
- Flow/Google **계정 이메일·비밀번호를 코드나 job JSON에 절대 쓰지 않는다.** 인증은 전용 크롬 프로필의 로그인 세션에만 의존한다.

**약관 리스크 원칙:**

- `CONFIG.THROTTLE` 를 임의로 낮추지 말 것. 폭주 자동화는 계정 제한 위험.
- 병렬 탭/병렬 생성 금지. 항상 직렬 1건.

---

## 1. 확정된 운영 파라미터 (이 값을 전제로 구현)

| 항목 | 확정값 | 비고 |
|---|---|---|
| Flow 플랜 | **Google AI Ultra** | |
| 모델 | `Veo 3.1 Fast [Lower Priority]` | 대안: `Veo 3.1 Lite [Lower Priority]` (더 저렴, 실험적) |
| 크레딧 단가 | **10 크레딧 / 생성 1회** (Ultra) | `CREDITS_PER_GENERATION = 10` |
| 월 예산 | **4,000 크레딧** (자체 상한) | → 월 **400 생성** 가능 |
| 출력 개수 | **프롬프트당 1개로 강제** | 2개 출력 = 크레딧 2배. 반드시 1로 고정 |
| 편당 생성수 | **포맷별 하이브리드** | 아래 표 |
| 하루 생산량 | 2편 (시의성 1 + 에버그린 1) | |

**포맷별 extend 프리셋 (Phase 1에서 job JSON 스키마로만 반영, 생성기는 Phase 5):**

| 포맷 | 목표 길이 | extend 총합 | 편당 생성수 |
|---|---|---|---|
| ① 마스터 경고/예언 | ~22초 | 2 | 3 |
| ② 일간 캐릭터 리비일 | ~22초 | 2 | 3 |
| ③ 오행 무드/ASMR | ~36초 | 4 | 5 |
| ④ 사주 vs 별자리 | ~22초 | 2 | 3 |
| ⑤ 오늘/이번 주 운세 | ~22초 | 2 | 3 |
| ⑥ 마스터 소개 | ~36초 | 4 | 5 |

**예산 검산:** 하루 (3생성 + 5생성) = 8생성 → 월 240생성 = **2,400 크레딧**.
잔여 1,600 크레딧(40%)은 재생성·실패 복구 버퍼. 4,000 상한 안에 안전하게 들어간다.

> ⚠️ `CONFIG.DEFAULT_EXTEND` 기본값을 **4 → 2** 로 변경한다. job에서 씬별 override.

---

## 2. Phase 0 — 실측 검증 (코드 수정 전 필수 선행)

**목적:** 지금 파이프라인에는 **검증되지 않은 전제 3개**가 있고, 이 중 하나라도 틀리면 코드를 아무리 잘 고쳐도 결과물이 망가진다. 그래서 코드 수정 전에 사람이 Flow UI를 손으로 만져서 사실을 확정한다.

### Phase 0 산출물: `automation/FLOW_UI_FACTS.md`

아래 항목을 **실제 Flow 화면에서 직접 확인**하고, 화면 캡처 파일명과 함께 이 문서에 기록한다.
(캡처는 `automation/_facts/` 에 저장. 이 폴더는 `.gitignore` 에 추가할 것 — 계정 정보가 화면에 찍힐 수 있음.)

**F1. 프로젝트 진입 경로**
- `https://labs.google/flow` 로 접속했을 때 나오는 화면은 대시보드인가 편집기인가?
- 편집기(생성 가능 화면)의 **URL 패턴**은? (예: `.../flow/project/<id>`)
- → 이 URL을 자동화 진입점으로 쓸 수 있는지 기록. 프로젝트 하나를 "K-Destiny 자동화" 로 만들고 그 URL을 확보.

**F2. 모델 선택 UI**
- 모델 드롭다운을 여는 요소의 정확한 텍스트/aria-label
- 목록에 실제로 표시되는 항목 전체를 그대로 적기 (예: `Veo 3.1 Fast`, `Veo 3.1 Fast - Lower Priority`, `Veo 3.1 Lite - Lower Priority`, `Veo 3.1 Quality` …)
- 각 항목 옆에 표시되는 **크레딧 숫자**를 그대로 적기
- **현재 선택된 모델이 UI에서 어떻게 표시되는지** (선택 상태 판별용 — fail-closed 구현에 필요)

**F3. 출력 개수(Outputs per prompt) 설정**
- 설정 위치와 현재 값
- 1로 설정 가능한지, 기본값이 몇인지
- → **기본값이 2 이상이면 크레딧이 2배로 나가고 있다는 뜻.** 최우선 확인 항목.

**F4. 크레딧 잔액 표시** ★ 가장 중요
- 잔액이 화면 어디에 어떤 형식으로 뜨는가? (예: `9,840 credits`)
- **1회 생성 전/후 잔액 차이를 실측** → 실제 단가 확정
  - 생성 전 잔액: ______
  - 생성 후 잔액: ______
  - 차이(= 실단가): ______
- Extend 1회의 차이도 동일하게 실측: ______

**F5. Extend 다운로드 의미** ★★ 가장 중요 (파이프라인 근본 전제)
- 8초 클립 1개 생성 → Extend 1회 → **다운로드한 mp4의 재생 길이(ffprobe)**를 기록
  - 초기 클립 길이: ______초
  - Extend 후 다운로드 길이: ______초
- 판정:
  - 길이가 **약 7초** → `delta` 모드 (새 구간만 받아짐) → 현재 코드 설계가 맞음
  - 길이가 **약 15초** → `cumulative` 모드 (누적본이 받아짐) → **매 Extend를 병합하면 내용이 중복된다.** 마지막 결과 1개만 써야 함
- Extend 2회까지 더 해보고 길이 변화를 기록 (8 → ? → ?)

**F6. 결과 타일 구조**
- 생성이 끝나면 결과가 어디에 어떤 DOM 구조로 쌓이는가? (타임라인? 갤러리? 리스트?)
- **각 결과에 고유 식별자(data 속성, id, href, blob URL)가 있는가?**
- 다운로드 버튼이 **결과 타일 안에** 있는가, 전역 툴바에 있는가?
- → 이게 D1/D2 수정의 핵심 정보다.

**F7. 생성 중 / 큐 상태 표시**
- "대기 중 / 생성 중 / 완료" 각 상태의 화면 문구를 **한글·영문 그대로** 적기
- Lower Priority 큐 대기 시 특별한 문구가 있는가?
- 실제 대기 시간 실측: 초기 생성 ______분 / Extend ______분

**F8. 에러 표시**
- 생성 실패 시 뜨는 요소의 구조 (토스트? 인라인?) 와 `role` 속성
- 정확한 문구

**F9. 다운로드 방식**
- 다운로드 클릭 시 브라우저 다운로드 이벤트가 발생하는가, 새 탭에서 열리는가?
- 파일명 패턴
- 화질 선택(720p/1080p) 팝업이 뜨는가?

### Phase 0 수용기준

- [ ] `automation/FLOW_UI_FACTS.md` 에 F1~F9 전부 기록됨 (빈칸 없음)
- [ ] F4 실단가와 F5 Extend 길이가 **숫자로** 기록됨
- [ ] `automation/_facts/` 가 `.gitignore` 에 추가됨
- [ ] Phase 0 결과를 요약해 보고 (특히 F5 판정 결과)

> **Phase 0을 통과하지 않은 상태로 Phase 1 코드를 커밋하지 말 것.**
> F5가 `cumulative` 로 나오면 Phase 1 지시 중 §3.5 를 반드시 적용한다.

---

## 3. Phase 1 — 코드 결함 수정 + 셀렉터 보정

Phase 0의 사실을 반영해 아래 15개 결함을 고친다. **각 항목마다 "무엇이 왜 잘못됐는지"를 명시했으니 그 의도를 유지해서 고칠 것.** 단순히 셀렉터 문자열만 바꾸면 D1~D5는 해결되지 않는다.

### 3.1 【치명】 D1 — 결과 식별성 부재로 "이전 클립"을 다운로드함

**현재 문제** (`flow_rpa.py: wait_generation_complete`, 200~228행)

```python
done = await any_visible(page, "result_media") or await any_visible(page, "download_button")
if (not generating) and done:
    return True
```

`result_media` 는 `['video', 'img[src^="blob:"]']` 이다. Flow 편집기에는 **이전에 생성한 결과 video가 이미 화면에 있다.** 따라서:

- 큐 진입 감지(30초 루프)가 실패하면 → 첫 폴에서 `generating=False`, `done=True` → **즉시 "완료" 오판**
- 그 뒤 `download_result()` 가 **직전 클립 또는 남의 클립을 다운로드**한다
- 밤새 돌면 같은 영상이 반복 저장되고, 크레딧은 정상 소모된다. **조용히 망가지는 최악의 실패 모드.**

**수정 요구사항**

1. 생성 제출 **직전에 결과 집합의 baseline 스냅샷**을 뜬다.
   - F6에서 확인한 결과 타일 셀렉터로 `count()` 와 **각 타일의 고유 키 목록**(data 속성 / href / video src)을 수집
2. 완료 판정을 **"baseline에 없던 새 타일이 등장했고, 그 타일이 재생 가능 상태(에러/플레이스홀더 아님)"** 로 바꾼다
3. `wait_generation_complete()` 시그니처를 변경해 baseline을 인자로 받고, **새로 등장한 타일 Locator를 반환**한다

```python
async def snapshot_results(page) -> set[str]:
    """생성 전 결과 타일의 고유 키 집합. 새 결과 식별의 기준선."""

async def wait_new_result(page, baseline: set[str]):
    """baseline에 없는 새 결과 타일이 완성될 때까지 대기 → 그 타일 Locator 반환.
    반드시 새 타일을 반환한다. 못 찾으면 TimeoutError."""
```

4. **고유 키를 얻을 수 없는 UI라면** 차선책: `count()` 증가 + "가장 마지막(최신) 타일" 을 쓴다. 단 이 경우 **제출 전 count를 반드시 기록**하고 `count > baseline_count` 가 성립할 때만 완료로 인정한다. `count` 만으로 판정하는 구현은 F6에서 고유 키가 없다는 사실을 문서에 기록한 경우에만 허용.

5. 큐 진입 감지 루프(30초)가 실패해도 **절대 즉시 완료로 넘어가지 않게** 한다. 최소 대기(`MIN_WAIT = 20초`)를 두고, 그 전에는 완료 판정을 하지 않는다.

### 3.2 【치명】 D2 — 다운로드 버튼을 페이지 전역에서 첫 번째로 잡음

**현재 문제** (`download_result`, 261~269행): `first_locator(page, "download_button")` 은 페이지의 **첫 번째** 다운로드 버튼이다. 이는 오래된 클립일 가능성이 높다.

**수정:** D1에서 반환된 **새 결과 타일 Locator를 스코프**로 삼아 그 안에서 다운로드한다.

```python
async def download_result(result_locator, out_path: Path):
    """새 결과 타일 내부의 다운로드 버튼만 클릭한다. 전역 검색 금지."""
    dl = result_locator.locator(<download selector>).first
    # 타일 내부에 없으면: 타일 hover/click → 컨텍스트 메뉴 → 다운로드
```

- F9에서 화질 선택 팝업이 확인되면 **1080p / 최고 화질을 선택**하는 단계를 추가한다.
- 다운로드 후 **파일 크기 > 100KB 이고 ffprobe로 재생 길이가 읽히는지** 검증한다. 0바이트/손상 파일을 성공으로 처리하지 말 것.

### 3.3 【치명】 D3 — 크레딧 원장이 상대경로라 가드가 무력화될 수 있음

**현재 문제** (`credits.py` 23행): `LEDGER = Path("credit_ledger.json")` — **현재 작업 디렉터리 기준**이다.
Windows 작업 스케줄러는 시작 위치를 지정하지 않으면 `C:\Windows\System32` 등에서 실행한다. 그러면 **새 빈 원장이 생성되어 이번 달 사용량이 0으로 리셋**되고, **4,000 상한을 넘겨 생성**할 수 있다. 사용자가 명시한 절대 규칙("월 4,000 초과 금지")을 직접 위반하는 버그다.

**수정:**

```python
LEDGER = Path(__file__).resolve().parent / "credit_ledger.json"
```

`flow_rpa.py` 의 `FileHandler("flow_run.log")` 도 동일하게 `Path(__file__).resolve().parent / "flow_run.log"` 로 고정한다.
`assemble.py` 의 임시파일(`_concat.txt`, `_subs.ass`)은 이미 `dst.parent` 기준이므로 문제없다 — 확인만.

추가: `credits.py` 에 **원장 무결성 경고**를 넣는다. 원장 파일이 존재하지 않는데 이번 달 중순 이후라면 `log.warning("원장이 없습니다 — 경로가 바뀌었을 수 있습니다. 상한 가드가 무력화될 위험.")` 을 출력.

### 3.4 【중대】 D4 — 크레딧을 사후 기록해 과소계상됨

**현재 문제:** `credits.record()` 가 **다운로드 성공 후**에 호출된다(311, 327행). 생성은 성공했지만 다운로드가 실패하면 → 예외 → 재시도 → **재생성**. 실제 크레딧은 2회 차감됐는데 원장에는 1회만 기록된다. 밤새 반복되면 원장과 실제가 크게 벌어져 가드가 뚫린다.

**수정: 비관적 선기록(pessimistic pre-charge)**

```python
# 생성 제출 직전
credits.record(meta=f"...", state="pending")   # 먼저 적립
await submit_prompt_and_generate(...)
...
# 성공 시 상태만 confirmed 로 갱신 (금액은 그대로)
```

- 실패해도 **금액을 되돌리지 않는다** (실제로 크레딧이 소모됐을 가능성이 있으므로 안전측).
- 단, 제출 자체가 실패한 경우(버튼 클릭 실패 등 명백히 생성이 시작되지 않은 경우)는 `state="void"` 로 표시하고 합산에서 제외한다.
- `spent()` 는 `state != "void"` 인 항목만 합산.

**추가: UI 잔액 기반 자동 실측 보정**

`read_credits_ui()` 를 실제로 동작하게 만들어(F4 셀렉터 사용), 생성 **전/후 잔액을 파싱**해 실제 차감액을 계산하고 원장에 `observed_cost` 로 남긴다. 관측값이 `CREDITS_PER_GENERATION` 과 3회 연속 다르면 경고 로그를 남긴다. **값을 코드에서 자동으로 바꾸지는 말 것** (사람이 확인 후 수정).

### 3.5 【치명】 D5 — Extend 다운로드 의미 (Phase 0 F5 결과에 따라 분기)

`CONFIG` 에 모드를 추가하고 **두 모드 모두 지원**한다.

```python
EXTEND_DOWNLOAD_MODE = "delta"   # "delta" | "cumulative"  ← Phase 0 F5 결과로 확정
```

**`delta` 인 경우:** 현재 로직 유지 (매 Extend 다운로드 → 순서대로 병합)

**`cumulative` 인 경우 — 반드시 아래처럼 바꾼다:**

1. 씬의 **마지막 Extend 결과 1개만 다운로드**한다. 중간 Extend는 다운로드하지 않는다 (시간·디스크 절약)
2. 파일명은 `scene_XX_full.mp4` (누적본임을 명시)
3. `manifest.json` 의 `scenes[].files` 에는 그 1개만 넣는다
4. `assemble.py` 의 자막 타이밍 계산이 **클립 길이 합산 기준**(147~154행)이므로 그대로 두면 맞는다 — 단 씬 하나가 22초짜리 단일 클립이 되므로 **자막이 22초 동안 안 바뀐다.** 이건 Phase 4의 타임드 자막으로 해결할 문제이므로, **Phase 1에서는 `manifest.json` 에 `extend_mode` 필드를 기록만** 하고 Phase 4가 참조하게 한다
5. **체크포인트 재개 로직**(`run_scene` 291~296행)의 `expected = 1 + sc.extend` 계산이 `cumulative` 에서는 틀리다. 모드별로 기대 파일 수를 분기한다

### 3.6 【중대】 D9 — 모델 선택 실패를 warning으로 흘려 100크레딧 모델로 생성될 수 있음

**현재 문제** (`ensure_model_lower_priority`, 184~185행):

```python
except Exception as e:
    log.warning("모델 자동설정 실패(수동 확인 필요): %s", e)
```

모델 설정에 실패했는데 **배치는 그대로 진행**된다. 기본 선택이 `Veo 3.1 Quality`(100크레딧)라면 **1회 생성에 10배 크레딧**이 나가고, 하룻밤에 예산이 소진된다.

**수정: fail-closed**

1. 모델을 선택한 뒤 **선택 결과를 UI에서 다시 읽어 검증**한다 (F2의 "선택 상태 표시" 사용)
2. 검증 실패 시 `warning` 이 아니라 **예외를 던져 배치를 중단**한다
3. 실패 스크린샷을 남긴다

```python
async def ensure_model_lower_priority(page):
    ...
    actual = await read_selected_model(page)
    if CONFIG.MODEL_LABEL.lower() not in actual.lower() or \
       CONFIG.MODEL_PRIORITY_HINT.lower() not in actual.lower():
        raise RuntimeError(f"모델 확정 실패: 기대='{...}' 실제='{actual}' — 예산 보호를 위해 중단")
```

### 3.7 【중대】 D8 — 출력 개수(outputs per prompt)를 1로 강제하지 않음

프롬프트당 2개 출력이면 **크레딧이 정확히 2배** 나간다 (Google 문서: "a request that returns two videos incurs twice the model charge"). 현재 코드에는 이 설정을 만지는 로직이 아예 없다.

**수정:** `ensure_outputs_per_prompt(page, n=1)` 을 신설하고 `ensure_model_lower_priority()` 와 함께 배치 시작 시 호출. **D9와 동일하게 fail-closed** (1로 만들지 못하면 중단).

### 3.8 D6 — 에러 토스트 오검출로 크레딧을 낭비함

**현재 문제:** `'text=/error|failed|문제가|실패|try again/i'` 는 **페이지 어디든** 그 단어가 있으면 매칭된다. Flow UI의 도움말·안내문·이전 실패 기록에도 걸린다. 오검출 → 예외 → 재시도 → **불필요한 재생성 = 크레딧 낭비**.

**수정:**

1. F8에서 확인한 **실제 토스트 컨테이너로 스코프 제한** (`[role="alert"]`, `[aria-live]`, 토스트 클래스)
2. 문구도 F8의 실제 문구로 좁힌다
3. **에러 감지는 "새로 등장한" 알림에만 적용** — D1의 baseline 개념을 알림에도 적용하거나, 대기 시작 시점 이후 나타난 것만 인정
4. 에러 감지 시 재시도하기 전 **`credits.can_spend()` 를 다시 확인**한다

### 3.9 D7 — Flow 프로젝트 편집기 진입 로직이 없음

`page.goto("https://labs.google/flow")` 는 (F1에서 확인될) 대시보드일 가능성이 높다. 그 상태에서는 프롬프트 입력창이 없어 `first_locator("prompt_input")` 이 타임아웃된다.

**수정:**

1. `CONFIG.FLOW_PROJECT_URL` 을 추가하고 **환경변수 `FLOW_PROJECT_URL`** 로 주입받는다 (job JSON에 넣지 말 것 — 커밋되는 파일이므로)
2. 미설정 시 대시보드에서 프로젝트를 찾아 진입하는 폴백을 둔다
3. 진입 후 **프롬프트 입력창이 실제로 보이는지 확인**하고, 안 보이면 명확한 에러 메시지로 중단:
   `"편집기 진입 실패 — FLOW_PROJECT_URL 환경변수에 Flow 프로젝트 URL을 설정하세요"`
4. **로그인 세션 만료 감지**: 로그인 화면 셀렉터를 만나면 재시도하지 않고 `"Flow 로그인 세션 만료 — 전용 크롬 프로필에서 재로그인 필요"` 로 즉시 중단 (재시도해도 절대 통과 못 하므로 30분 타임아웃을 낭비하지 않게)

### 3.10 D14 — 재시도가 항상 재생성이라 크레딧을 태움

**현재 문제** (`run_scene` 298~344행): 예외가 나면 시도 전체를 다시 돈다. **다운로드만 실패한 경우에도 재생성**된다.

**수정:** 예외를 두 종류로 구분한다.

```python
class GenerationFailed(Exception): ...   # 생성 자체 실패 → 재생성 필요
class DownloadFailed(Exception): ...     # 생성은 성공, 다운로드만 실패 → 재다운로드만
```

`DownloadFailed` 는 **재생성 없이 다운로드만 3회 재시도**한다. 결과 타일 Locator를 보존해 두고 재사용.

### 3.11 D10 — 오디오 스트림 없는 클립에서 FFmpeg가 죽음

**현재 문제** (`assemble.py`):

- `normalize_clip` 47~52행: `-af aresample=48000` — 입력에 오디오 스트림이 없으면 FFmpeg가 에러로 종료
- `burn_and_mix` 111행: `[0:a]` 참조 — 병합본에 오디오가 없으면 filter_complex 실패

Veo 3는 보통 오디오를 생성하지만, 무음 결과나 Lite 모델 결과에서 오디오가 없을 수 있다. 이 경우 **밤새 생성한 클립을 조립 단계에서 전부 날린다.**

**수정:**

```python
def _has_audio(path: Path) -> bool:
    """ffprobe로 오디오 스트림 존재 확인."""
    p = _run(["ffprobe","-v","error","-select_streams","a",
              "-show_entries","stream=index","-of","csv=p=0", str(path)])
    return bool(p.stdout.strip())
```

- `normalize_clip`: 오디오가 없으면 `-f lavfi -i anullsrc=r=48000:cl=stereo` 를 추가해 **무음 트랙을 주입**한다 (이미지 분기와 동일 패턴)
- `burn_and_mix`: 오디오 유무에 따라 filter_complex 분기
- **`_run()` 실패 시 stderr 마지막 1500자만 보이는데**, 어떤 파일에서 실패했는지 파일명도 함께 예외 메시지에 넣는다

### 3.12 D12 — FFmpeg 동기 호출이 async 이벤트 루프를 막음

**현재 문제** (`run_batch.py` 39행): `assemble.build_from_manifest()` 는 동기 함수인데 async 루프 안에서 직접 호출된다. 인코딩이 수 분 걸리는 동안 이벤트 루프가 멈춰 **CDP 연결이 끊기거나 페이지 상태가 stale** 해질 수 있고, 다음 job에서 알 수 없는 실패가 난다.

**수정 (둘 중 하나, 1번 권장):**

1. **생성 단계와 조립 단계를 완전히 분리한다.** 모든 job의 생성을 먼저 끝내고 브라우저 연결을 닫은 뒤, 그다음 조립 루프를 돈다. (야간 배치에 더 적합 — 브라우저를 오래 붙들지 않음)
2. `await asyncio.to_thread(assemble.build_from_manifest, str(manifest))`

조립 실패가 **다른 job의 생성을 막지 않게** 한다 (job별 try/except 유지, 이미 있음 — 확인만).

### 3.13 D13 — CDP 연결 종료 방식

`finally: await browser.close()` — 주석은 "연결만 해제"라고 되어 있다. `connect_over_cdp` 에서는 그렇지만, **혹시라도 사용자의 전용 크롬 창이 닫히면 다음 실행이 전부 실패**한다.

**수정:** 종료 후 CDP 엔드포인트가 여전히 살아있는지 1회 확인하고 로그에 남긴다. 창이 닫히는 것이 확인되면 `browser.close()` 를 제거하고 연결을 그냥 놓아준다.

### 3.14 D15 — 레거시 파일 정리

`automation/gemini_rpa.py` 와 `automation/jobs/sample_video_yura_wealth.json` 은 Flow 이전(Gemini 채팅) 버전이다. 지금 파이프라인과 무관하며 혼동을 만든다.

**수정:** `automation/_legacy/` 로 이동. 삭제하지 말 것. `automation/README.md` 에 한 줄 명시.

### 3.15 셀렉터 보정 (본래 Phase 1 과제)

Phase 0의 F1~F9 결과를 `CONFIG.SELECTORS` 에 반영한다.

**원칙:**

- **텍스트/역할 기반 우선**: `get_by_role`, `has-text`, `aria-label` → CSS 클래스명은 최후 수단 (Flow는 난독화 클래스를 쓰므로 클래스 기반은 곧 깨진다)
- **한/영 후보 병행** (사용자 브라우저 언어에 따라 UI가 바뀔 수 있음)
- 기존 후보는 **지우지 말고 뒤로 밀고, 검증된 새 후보를 맨 앞에 추가**한다
- 새로 추가할 키: `result_tile`(F6), `outputs_per_prompt`(F3), `selected_model`(F2), `login_wall`(D7), `quality_option`(F9)

**탐색 방법:**

```bash
cd automation
set FLOW_PROJECT_URL=<Flow 프로젝트 URL>
set PWDEBUG=1
python flow_rpa.py jobs/sample_master_warning.json
```

Playwright Inspector 로 각 요소를 pick 해 셀렉터를 얻는다.

---

## 4. Phase 1 수용기준 (전부 충족해야 통과)

### A. 안전장치 (예산 보호)

- [ ] `credits.LEDGER` 가 `__file__` 기준 절대경로다
- [ ] **다른 작업 디렉터리에서 실행해도 같은 원장을 읽는다**
  검증: `cd C:\ && python C:\...\automation\credits.py` → 기존 사용량이 그대로 나온다
- [ ] `MONTHLY_BUDGET` 을 임시로 20으로 낮추면, **2번째 생성 시도 전에 배치가 에러 없이 정상 종료**된다
  로그에 `크레딧 상한 도달 → 배치 정상 종료` 가 남고, 프로세스 종료코드는 0
- [ ] `CREDITS_PER_GENERATION = 10` 이고, Phase 0 F4 실측값과 일치한다
- [ ] `CONFIG.DEFAULT_EXTEND == 2`
- [ ] 모델 확정 실패 시 **배치가 중단**된다 (모델 셀렉터를 일부러 깨뜨려 확인)
- [ ] 출력 개수 1 강제 실패 시 **배치가 중단**된다
- [ ] 원장에 `state` 필드가 있고, 생성 **제출 전**에 기록된다

### B. 결과 정확성 (조용한 실패 방지)

- [ ] `wait_new_result()` 가 baseline을 인자로 받고 **새 타일 Locator를 반환**한다
- [ ] `download_result()` 가 **결과 타일 Locator를 스코프**로 받는다 (page 전역 검색 없음)
- [ ] **의도적 검증:** 이미 결과가 1개 이상 있는 프로젝트에서 실행해도 **직전 클립이 저장되지 않는다**
  → 다운로드된 파일의 재생 길이·내용이 방금 생성한 것과 일치함을 육안 확인
- [ ] 다운로드 후 파일 크기 > 100KB 이고 ffprobe로 길이가 읽힌다
- [ ] `EXTEND_DOWNLOAD_MODE` 가 Phase 0 F5 결과대로 설정되고, 해당 모드 로직이 동작한다
- [ ] `manifest.json` 에 `extend_mode` 가 기록된다

### C. 엔드투엔드

- [ ] `automation/jobs/` 에 **본 지시서 §1 프리셋에 맞춘 새 샘플 job**(포맷① 22초 / extend 2 구성)을 추가하고, 그 job으로 아래를 완주한다
- [ ] 사람 개입 없이 **생성 → Extend 2 → 다운로드 → 정규화 → 병합 → 자막 → BGM → `<video_id>_FINAL.mp4`** 완료
- [ ] `_FINAL.mp4` 가 **1080x1920 / 30fps / 오디오 있음** (ffprobe 출력 첨부)
- [ ] 한글 자막이 화면에 정상 렌더된다 (□□□ 깨짐 없음) — 스크린샷 첨부
- [ ] BGM 파일이 없어도 (`bgm` 빈 문자열) 에러 없이 완주한다
- [ ] **오디오 없는 클립을 강제로 하나 섞어도** 조립이 완주한다
  검증: `ffmpeg -i in.mp4 -an -c:v copy noaudio.mp4` 로 만들어 넣고 `assemble.py` 단독 실행

### D. 견고성

- [ ] `flow_run.log` 가 `automation/` 아래에 절대경로로 생성된다
- [ ] 로그인 화면을 만나면 **재시도 없이 즉시 명확한 메시지로 중단**한다
- [ ] 큐 진입 감지가 실패해도 최소 대기(20초) 전에는 완료 판정하지 않는다
- [ ] `DownloadFailed` 는 재생성 없이 다운로드만 재시도한다
- [ ] `automation/gemini_rpa.py` 가 `automation/_legacy/` 로 이동됐다
- [ ] `automation/_facts/` 가 `.gitignore` 에 있다

### E. 보안·규칙

- [ ] 스테이징 diff에 `sk-`, `password=`, `DEPLOY_PASS=`, `chltnrud`, `BEGIN ... PRIVATE KEY` 없음
- [ ] Google/Flow 계정 정보가 어떤 커밋 파일에도 없음
- [ ] `FLOW_PROJECT_URL` 은 환경변수로만 주입 (코드·job JSON에 하드코딩 없음)
- [ ] 제품 런타임 코드(`app/`, `components/`, `lib/`, `next.config.ts` 등) **변경 0건**
  검증: `git diff --stat` 결과에 `automation/` 과 `.gitignore` 외의 경로 없음
- [ ] `scripts/safe_deploy.py` 를 실행하지 않았음
- [ ] 모든 주석·문서·로그 메시지 한글

---

## 5. 검증 명령 (그대로 실행해 결과를 보고)

```bash
# 0) 전용 크롬 (평소 쓰는 크롬과 분리)
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\kd\chrome-profile"
# → 그 창에서 Google 로그인 + Flow 프로젝트 열기

# 1) 크레딧 원장 경로 독립성
cd C:\
python "C:\Users\gmose\OneDrive\바탕 화면\k-destiny\automation\credits.py"
# 기대: 프로젝트 폴더에서 실행한 것과 동일한 사용량 출력

# 2) 예산 가드 (MONTHLY_BUDGET=20 임시 변경 후)
cd "C:\Users\gmose\OneDrive\바탕 화면\k-destiny\automation"
set CDP_PORT=9222
set FLOW_PROJECT_URL=<프로젝트 URL>
python run_batch.py jobs/<새샘플>.json
echo 종료코드=%ERRORLEVEL%
# 기대: 종료코드 0, 로그에 "크레딧 상한 도달 → 배치 정상 종료"

# 3) 엔드투엔드 (MONTHLY_BUDGET 복구 후)
python run_batch.py jobs/<새샘플>.json

# 4) 결과 검증
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,duration ^
  -of default=nw=1 "C:\kd\out\<video_id>\<video_id>_FINAL.mp4"
# 기대: video 1080x1920 30/1, audio 존재, duration ~22초

# 5) 무음 클립 방어
ffmpeg -y -i <클립> -an -c:v copy noaudio.mp4
# noaudio.mp4 를 manifest.clips 에 섞어 assemble.py 단독 실행 → 완주 확인

# 6) 변경 범위 확인
cd "C:\Users\gmose\OneDrive\바탕 화면\k-destiny"
git diff --stat
git diff --cached | findstr /C:"sk-" /C:"password=" /C:"DEPLOY_PASS="
```

---

## 6. 보고 형식

Phase 0 완료 시 / Phase 1 완료 시 각각 아래를 한글로 보고:

1. **변경 파일 목록 + `git diff --stat`**
2. **각 결함(D1~D15)별 처리 결과** — 수정함 / 해당없음(이유) / 미처리(이유)
3. **Phase 0 F1~F9 실측값** (특히 F4 실단가, F5 Extend 길이 판정)
4. **§4 수용기준 체크리스트를 그대로 복사해 O/X 로 채운 것** — X가 있으면 이유
5. **§5 검증 명령의 실제 출력** (ffprobe 출력, 종료코드, git diff --stat 전문)
6. **자막 렌더 스크린샷** 1장
7. **막힌 지점 / 판단이 필요한 지점**

> 수용기준을 못 채운 항목이 있으면 **"완료"로 보고하지 말 것.** 미충족 항목과 이유를 적어 되돌려주면 개발총괄이 재지시한다.
