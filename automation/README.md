# K-Destiny 영상 자동생산 파이프라인 v2 — Google Flow(Veo3-fast) 야간 무인 배치

로컬 Chrome(원격 디버깅)로 **Google Flow(labs.google/flow)** 를 Playwright RPA 제어 →
`veo3-fast` 로 크레딧 최소 소모 → 22~36초 클립 생성/연장/다운로드 →
FFmpeg로 자막·BGM까지 구운 완성 숏츠 → 하루 2편 수동 예약.
**밤새 안 멈추는 안정성**과 **월 4000 크레딧 상한 준수**가 최우선.

## 0. 무엇이 바뀌었나 (Gemini 채팅 → Flow 반영)
- 대상 UI를 **Google Flow**로 교체(`flow_rpa.py`). (기존 `gemini_rpa.py` 등은 `_legacy/`로 이동)
- **모델 자동 고정**: `ensure_model_lower_priority()` 가 `veo3-fast [Lower Priority]` 선택. 실패 시 안전을 위해 즉각 배치를 중단(fail-closed).
- **초장기 대기**: `GEN_TIMEOUT = 30분`(큐/Pending 통과), 완료는 상태로 판정(고정 sleep 없음).
- **Extend 기본 2회**: `DEFAULT_EXTEND=2`로 변경. 씬별 override 가능.
- **월 4000 크레딧 가드 신설**(`credits.py`): 상한 임박 시 **에러 아님 · 정상 종료**.
- 안정성: 씬/클립 단위 **체크포인트(중단 후 재개)**, 다운로드 실패 시 생성 재시도 방어(D14), 무음 오디오 파일 파이프라인 죽음 방어(D10).

## 1. 파일
```
automation/
├─ flow_rpa.py    # [핵심] Flow RPA: 연결·모델고정·초장기대기·업로드·생성·Extend·크레딧가드
├─ credits.py     # 월 4000 크레딧 원장/가드 (달 바뀌면 자동 리셋)
├─ assemble.py    # FFmpeg: 정규화·병합·자막(.ass)·BGM·음량정규화 = CapCut 대체
├─ run_batch.py   # 야간 배치 오케스트레이터 + upload_manifest.csv
├─ _legacy/       # 구버전 Gemini RPA 및 관련 리소스
└─ jobs/
   └─ sample_master_warning.json   # 샘플: 마스터 카르마 '10월 경고' (3씬·5생성·22초)
```

## 2. 요청 4종 코드 위치
1. **로컬 브라우저 셋업 + 연결** → 아래 §3 명령어 + `flow_rpa.connect_browser()`(`connect_over_cdp`)
2. **UI 제어(Lower Priority 모델 선택/업로드/Extend)** → `ensure_model_lower_priority()`, `upload_image()`, `run_scene()` 내 Extend 루프. 셀렉터는 `CONFIG.SELECTORS`(텍스트/구조 기반 다중 후보).
3. **야간용 초장기 Wait** → `wait_new_result()` (스피너/큐 소멸 + 새로 생성된 타일 등장, 타임아웃 30분, 에러토스트 감지 시 즉시 중단)
4. **FFmpeg 병합** → `assemble.concat_clips()` / 전체 파이프라인 `build_from_manifest()`

## 3. 로컬 Chrome 원격 디버깅 실행 (자동화 전용 프로필)
평소 쓰는 크롬과 분리된 전용 프로필로 띄우고, 그 창에서 **구글 로그인 + Flow 접속**을 한 번 해둡니다.
```bat
:: Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\kd\chrome-profile"
```
```bash
# 이후 실행
set CDP_PORT=9222
set FLOW_PROJECT_URL=https://labs.google/flow/project/내프로젝트ID
python run_batch.py                       # jobs/ 전체
python run_batch.py jobs/sample_master_warning.json
```
- 낮에 쓰는 기본 크롬(기본 프로필)은 안 건드립니다. 자동화는 `C:\kd\chrome-profile` 전용만 제어.

## 4. 설치
```bash
pip install playwright requests
playwright install chromium         # (CDP 연결만 쓰면 실제로는 로컬 크롬 사용)
winget install Gyan.FFmpeg          # FFmpeg + ffprobe (PATH 등록)
```
- `assemble.py`의 `FONT` 를 한글 폰트로(기본 맑은 고딕 Bold).

## 5. ★ 크레딧 예산 (월 4000 절대 초과 금지)
`credits.py` 상단 두 값을 **실측으로 보정**하세요:
```python
MONTHLY_BUDGET = 4000
CREDITS_PER_GENERATION = 10   # ← Flow에서 veo3-fast 1회 생성 후 줄어든 크레딧으로 교체
```
보정법: Flow에서 Lower Priority로 1클립 생성 → 화면 크레딧 잔액이 몇 줄었는지 확인 → 그 값 입력(초기·Extend 각각 1회로 계산).

**생산량 계산(중요):**
- 월 4000 크레딧. 하루 8생성(포맷① 3생성 + 포맷③ 5생성 등 하이브리드) = 80크레딧/일. 월 약 2400 크레딧(재생성 버퍼 포함 충분).
- 가드가 알아서 상한에서 멈추니 **초과 결제는 발생하지 않습니다.** 다만 원하는 편수를 맞추려면 위 계산으로 연장수/편수를 조절하세요.
- 현재 상태 확인: `python credits.py` → `[크레딧] 이번달 X/4000 사용 · 잔여 Y · 생성가능 약 Z클립`

## 6. 야간 무인 스케줄 (자는 동안 생산)
1. **저녁 퇴근 후**: 완성본 검수 → YouTube/TikTok/IG 업로드·예약 → 내일치 `jobs/` 2개 넣기 → 전용 크롬(9222) 로그인 확인.
2. **PC 절전 해제**(자동화 중 잠들면 멈춤):
   ```bat
   powercfg /change standby-timeout-ac 0
   powercfg /change monitor-timeout-ac 0
   ```
3. **작업 스케줄러**로 새벽 실행(예 01:00): 프로그램 `python`, 인수 `run_batch.py`, 시작위치 = automation 폴더. (환경변수 `FLOW_PROJECT_URL` 지정 필수)
   - 크롬은 상시 켜두거나, 스케줄러가 크롬 실행(§3) → 대기 → `run_batch.py` 순으로.
4. **아침/저녁**: `out/<video_id>/<video_id>_FINAL.mp4` 검수 + `upload_manifest.csv` 로 예약.

## 7. 작업 지시서(JSON) 스키마
| 필드 | 뜻 |
|---|---|
| `video_id` | 결과 폴더/파일명. `YYYYMMDD_슬롯_주제` 권장 |
| `title_ko` / `caption_hashtags` | 업로드 예약표 기록용 |
| `bgm` | 배경음 mp3(없으면 생략) |
| `thumbnail_prompt` | Nano Banana 2 썸네일 프롬프트 |
| `scenes[].prompt` | Veo3 생성 프롬프트 |
| `scenes[].ref_image` | image-to-video 참조(마스터 이미지 경로) |
| `scenes[].extend` | 연장 횟수(기본 2). 씬 나눠 자막 바꾸려면 낮춰서 배분 |
| `scenes[].caption` | 그 씬 구간에 자동으로 구워질 자막(`\n` 개행) |

> 팁: "30초=1씬 5연장"도 되지만, 샘플처럼 **여러 짧은 씬으로 나누면 자막이 바뀌어** 스토리가 살고 크레딧은 동일(총 생성수만 같으면 됨).

## 8. 유지보수 — 셀렉터가 깨졌을 때
로직은 그대로, `CONFIG.SELECTORS`에 **새 후보만 추가**. 새 셀렉터 찾기:
```bash
set PWDEBUG=1 
python flow_rpa.py jobs/sample_master_warning.json
```
- 텍스트/역할 기반 우선(`has-text`, `aria-label`), 한/영 후보 병행.
- 특히 **모델 선택·Extend·Download** 3곳은 Flow 업데이트 시 자주 바뀌니 후보를 넉넉히.

## 9. ⚠️ 리스크 & 원칙
- **약관 회색지대**: 본인 계정·구독 한도 내 자동화. `THROTTLE`로 간격 두고, 폭주 금지(계정 제한 위험).
- **UI 의존**: Flow가 바뀌면 셀렉터 깨짐(§8로 대응) — RPA의 본질적 취약점.
- **야간 무인은 가끔 멈춥니다**: 세션 만료/팝업/큐 초과. 체크포인트로 '멈춘 지점부터 재개'되게 설계 → 아침에 `run_batch.py` 재실행만.
- **처음 2~3일은 지켜보며** 셀렉터·크레딧 실측을 보정한 뒤 완전 무인으로.
- **품질 검수**: 이상한 클립은 그 `scene_XX_YY.mp4`만 지우고 재실행 → 그 클립만 다시 생성(크레딧 절약).
