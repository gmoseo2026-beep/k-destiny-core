# flow_rpa.py 전면 디버깅 지시서

## 🎯 목표
`automation/flow_rpa.py` + `run_batch.py` 파이프라인이 Google Flow UI에서 **Veo 영상 생성 → 다운로드 → 조립**까지 정상 동작하도록 수정.

---

## 📋 현재 상황

### Chrome CDP 환경
- Chrome이 `--remote-debugging-port=9222 --user-data-dir="C:\kd\chrome_fresh"` 로 실행 중
- **Google 계정 로그인 완료**, Flow 프로젝트 진입 완료
- `FLOW_PROJECT_URL=https://labs.google/fx/tools/flow/project/8f8c4126-99bb-4477-9e21-9494dbc9673e`
- 설정: Veo 3.1 - Lite, 9:16, x1, Never (자동 생성) — **이미 정상 확인됨**

### 테스트 대상 잡
```
python run_batch.py "jobs\03_karma_fortune_1997.json"
```

---

## 🐛 발견된 버그 3가지

### 버그 1: `_close_settings_panel()` — Save 버튼 x좌표 필터링 문제
- **상태: 이미 수정 완료 ✅**
- 원인: Save 버튼이 x=1000 부근(패널 중앙)에 있어서 `x > 1050` 필터에 걸림
- 수정: Save 버튼은 x좌표 무관하게 클릭하도록 변경 (line 655~)

### 버그 2: `_ensure_outputs_section()` — VIDEO_SECTION 셀렉터 불일치
- **상태: 이미 수정 완료 ✅ (경고로 전환)**
- 원인: `CONFIG.VIDEO_SECTION` 셀렉터가 현재 Flow UI에서 매치 안 됨
- 수정: 예외를 경고로 전환하고 기본값(1x) 가정
- **추가 필요**: 실제 셀렉터를 찾아서 `CONFIG.VIDEO_SECTION` 업데이트 권장

### 버그 3: `submit_prompt_and_generate()` — 생성이 실제로 트리거되지 않음 ❌
- **상태: 미해결 (핵심 버그)**
- 증상: 로그에는 "프롬프트 전송 & 생성 시작(541자)" 출력 → 이후 `wait_new_result()`에서 무한 대기
- 스크린샷 확인 결과: 프롬프트 입력란이 비어있고 생성 로딩 없음
- **가능한 원인들:**
  1. `prompt_input`으로 잡힌 `div[contenteditable="true"][role="textbox"]`에 `page.keyboard.type()` 입력이 안 됨
  2. `upload_image()`에서 "Add to Prompt" 클릭 실패 후 모달/오버레이가 프롬프트를 가림
  3. `generate_button` 클릭 시점에 프롬프트가 비어있어서 Create 버튼이 비활성화 상태

---

## 🔍 진단 데이터

### DOM 분석 결과 (2026-07-29 10:24)

#### prompt_input 셀렉터
```
"prompt_input": [
    'textarea',                                        → 1개, vis=False
    'div[contenteditable="true"][role="textbox"]',     → 1개, vis=True (패널 닫힌 후)
    '[placeholder*="prompt" i]',                       → 0개
]
```
- 프롬프트 입력란: `"What do you want to create?"` (하단, contenteditable div)
- **textarea는 숨겨져 있음** — 이것이 잡히면 입력이 사라짐

#### generate_button 셀렉터
```
"generate_button": [
    'button:has-text("Create"):has(i:has-text("arrow_forward"))',  → 1개, vis=True, x=778 y=795
    'button:has-text("Generate")',
    'button:has-text("생성")',
    'button[aria-label*="generate" i]'
]
```
- 생성 버튼은 정상 매치 (화살표 아이콘 `→`)

#### settings_open 셀렉터
```
"settings_open": ['button:has-text("tune")']
```
- Agent settings 열기 버튼. Flow UI에서 톱니바퀴(⚙️) 아이콘 옆에 있음

### 스크린샷 파일들
- `C:/kd/out/flow_screenshot.png` — Agent settings 패널 열린 상태
- `C:/kd/out/flow_after_close.png` — Save 후 패널 닫힌 정상 상태
- `C:/kd/out/flow_current.png` — 생성 실패 후 현재 상태 (프롬프트 비어있음)

---

## 🛠️ 디버깅 절차

### 1단계: 현재 Flow UI DOM 완전 분석
```python
# scratch 스크립트로 Playwright CDP 연결 후 DOM 분석
# 아래 요소들의 정확한 셀렉터를 파악:
# - 프롬프트 입력란 (contenteditable div)
# - 이미지 업로드 '+' 버튼
# - 이미지 업로드 후 'Add to Prompt' 팝업
# - 'Create' 생성 버튼
# - 생성 중 indicator
# - 결과 타일 (result_tile)
# - 타일 메뉴 / 다운로드 메뉴
```

### 2단계: 이미지 업로드 플로우 검증
`upload_image()` 함수 (line 408~) 분석:
1. '+' 버튼 클릭 → 팝업 열기
2. file_input에 이미지 경로 설정
3. "Add to Prompt" 클릭
- **이 과정에서 Flow UI가 변경되었을 가능성 높음**

### 3단계: 프롬프트 입력 검증
```python
# 테스트: contenteditable div에 실제로 텍스트가 입력되는지 확인
# box.focus() → page.keyboard.type("test") → div.innerText 확인
```

### 4단계: Create 버튼 클릭 후 생성 시작 확인
```python
# 테스트: 프롬프트 입력 후 Create 클릭 → generating_indicator 감지 확인
```

### 5단계: wait_new_result() 폴링 검증
- `result_tile` 셀렉터 매치 확인
- `generating_indicator` 셀렉터 매치 확인
- `snapshot_results()` baseline 카운트 정확성 확인

---

## 📁 관련 파일들

| 파일 | 역할 |
|------|------|
| `automation/flow_rpa.py` | 핵심 RPA 스크립트 (Playwright CDP) |
| `automation/run_batch.py` | 배치 실행기 (flow_rpa + assemble 통합) |
| `automation/assemble.py` | Veo 클립 → 22초 완성본 조립 (Ken Burns, 자막, BGM) |
| `automation/credits.py` | 크레딧 추적 |
| `automation/jobs/03_karma_fortune_1997.json` | 테스트할 잡 파일 |
| `automation/.env` | FLOW_PROJECT_URL 설정 |
| `automation/FLOW_SELECTORS_확정.md` | 이전 셀렉터 분석 문서 |
| `automation/FLOW_UI_FACTS.md` | Flow UI 팩트 시트 |

### flow_rpa.py 핵심 함수 위치
| 함수 | 라인 | 역할 |
|------|------|------|
| `CONFIG (SELECTORS)` | 70~130 | 모든 CSS 셀렉터 정의 |
| `connect_browser()` | 196~217 | CDP 연결 |
| `first_locator()` | 249~261 | 셀렉터 매칭 유틸 |
| `wait_new_result()` | 358~404 | 생성 완료 대기 (폴링) |
| `upload_image()` | 408~500 | 이미지 업로드 |
| `submit_prompt_and_generate()` | 503~518 | 프롬프트 입력 + Create 클릭 |
| `_ensure_outputs_section()` | 633~652 | 출력 개수 설정 |
| `_close_settings_panel()` | 655~705 | 설정 패널 닫기 |
| `ensure_flow_settings()` | 706~745 | 설정 확인 메인 |
| `run_job()` | 760~960 | 잡 실행 메인 (씬 루프) |

---

## ✅ 검증 방법

디버깅 완료 후 아래 명령으로 전체 파이프라인 테스트:
```bash
cd automation
python run_batch.py "jobs\03_karma_fortune_1997.json"
```

성공 기준:
1. 3개 씬(scene_01/02/03) 클립이 `C:\kd\out\karma_fortune_1997\` 에 다운로드됨
2. `assemble.py`가 KO/EN 22초 최종 영상을 생성
3. `_upload_meta.json` 메타데이터 파일 생성

---

## ⚠️ 보안 규칙
- `automation/.env`는 gitignore 대상. 절대 커밋하지 말 것.
- 비밀번호/API키를 코드에 하드코딩하지 말 것.

## 💡 팁
- Playwright CDP 연결 테스트: `python -c "import urllib.request; r = urllib.request.urlopen('http://127.0.0.1:9222/json/version'); print(r.read().decode()[:80])"`
- 스크린샷 캡처: `await page.screenshot(path='C:/kd/out/debug.png')`
- DOM 검사 스크립트 위치: `scratch/check_dom.py` (artifacts 디렉토리)
- **cp949 인코딩 문제**: Python stdout을 `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')` 로 전환 필요
