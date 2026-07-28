#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
flow_rpa.py — Google Flow (labs.google/flow) Veo3 야간 무인 배치 RPA
=====================================================================
로컬 Chrome(원격 디버깅 포트)로 Flow 웹 UI를 제어해 Veo3 클립을 생성/연장/다운로드.
크레딧 최소화를 위해 모델을 'veo3-fast3.1 [Lower Priority]'로 고정하고,
Lower Priority 서버 큐로 대기가 매우 길 수 있으므로 초장기 타임아웃으로 버틴다.

설계 최우선순위 = '밤새 안 멈추는 안정성'
- 초장기 동적 대기(기본 30분) + 큐(pending) 상태 통과
- 씬 단위 체크포인트(이미 받은 클립 스킵=중단 후 재개)
- 재시도 + 실패 스크린샷 + CDP 재연결
- 월 4000 크레딧 가드(credits.py): 상한 임박 시 '정상 종료'(에러 아님)

⚠️ Flow의 실제 DOM은 수시로 바뀝니다. CONFIG.SELECTORS 의 후보를 실화면에 맞게
   보정하세요(§유지보수 레시피는 README). 로직은 셀렉터와 분리돼 있어 안 부서집니다.
"""

import asyncio
import json
import logging
import os
import sys
import re
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import async_playwright, TimeoutError as PWTimeout

import credits  # 월 4000 크레딧 가드


class CONFIG:
    FLOW_URL = os.environ.get("FLOW_PROJECT_URL", "")  # D7
    CDP_PORT = os.environ.get("CDP_PORT", "9222")     # 로컬 크롬 원격 디버깅 포트

    MODEL_LABEL = "veo3-fast"          # 선택할 모델(부분일치). "Lower Priority" 포함 항목 우선
    MODEL_PRIORITY_HINT = "Lower Priority"

    DEFAULT_EXTEND = 2                     # 기본 연장 2회 (Phase 1 확정)
    EXTEND_DOWNLOAD_MODE = "cumulative"    # "delta" | "cumulative" (Phase 0 F5 결과에 따라 수정 가능, 현재 cumulative 가정)

    # 타임아웃(ms) — Lower Priority 큐 대비 매우 넉넉하게
    NAV_TIMEOUT = 120_000
    UI_TIMEOUT = 45_000
    GEN_TIMEOUT = 1_800_000               # 30분: 큐+렌더 최악 대비
    POLL_INTERVAL = 8.0                   # 완료 폴링 간격(초) — 긴 작업이라 느긋하게
    THROTTLE = 6.0                        # 작업 간 최소 간격
    MIN_WAIT = 20.0                       # 최소 대기 시간 (D1)

    RETRIES = 2

    SELECTORS = {
        # 모델 선택 드롭다운을 여는 버튼(모델명/설정 아이콘 등)
        "model_open": [
            'button:has-text("veo")',
            'button[aria-label*="model" i]',
            'button:has-text("Model")',
            '[data-testid*="model"]',
        ],
        # 드롭다운 안의 모델 옵션(veo3-fast, Lower Priority)
        "model_option_fast": [
            'text=/veo\\s*3\\s*fast/i',
            'li:has-text("Fast")',
            '[role="option"]:has-text("Fast")',
        ],
        "selected_model": [
            '[aria-haspopup="listbox"]', # 드롭다운 텍스트 표시
            '.selected-model'
        ],
        "outputs_per_prompt": [
            '[aria-label*="outputs" i]',
            'text=/outputs per prompt/i'
        ],
        "prompt_input": [
            'textarea',
            'div[contenteditable="true"][role="textbox"]',
            '[placeholder*="prompt" i]',
        ],
        "generate_button": [
            'button:has-text("Generate")',
            'button:has-text("생성")',
            'button[aria-label*="generate" i]',
            'button:has-text("Create")',
        ],
        "attach_button": [
            'button[aria-label*="image" i]',
            'button[aria-label*="frame" i]',
            'button[aria-label*="ingredient" i]',
            'button[aria-label*="add" i]',
            'button:has-text("Frames")',
        ],
        "file_input": ['input[type="file"]'],
        # 생성 중 표시(스피너/큐/진행률/"Generating"/"Pending"/"In queue")
        "generating_indicator": [
            'text=/generating|pending|in queue|rendering|처리 중|대기/i',
            '[role="progressbar"]',
            '.loading, .spinner',
        ],
        # 실패/에러 토스트(있으면 즉시 재시도) - D6
        "error_toast": [
            '[role="alert"]:has-text("error")',
            '[role="alert"]:has-text("failed")',
            '[role="alert"]:has-text("문제가")',
            '[role="alert"]:has-text("실패")',
            '[role="alert"]:has-text("try again")',
            '[aria-live="assertive"]:has-text("error")'
        ],
        # 완료된 결과 클립 타일 (D1) - Phase 0 실측 전 미검증 추측값 (a6)
        "result_tile": [
            '[data-result-id]',
            'video',
            'img[src^="blob:"]'
        ],
        # 다운로드 (결과 타일 내)
        "download_button": [
            'button[aria-label*="download" i]',
            'button:has-text("Download")',
            'a[download]',
            'button:has(svg[aria-label*="download" i])',
        ],
        # 품질 선택
        "quality_option": [
            'text=/1080p/i'
        ],
        # Extend(연장)
        "extend_button": [
            'button:has-text("Extend")',
            'button:has-text("연장")',
            'button[aria-label*="extend" i]',
        ],
        # (선택) 화면의 크레딧 잔액 텍스트 — 로그/보정용
        "credit_balance": [
            'text=/\\bcredits?\\b/i',
            '[aria-label*="credit" i]',
        ],
        "login_wall": [
            'input[type="email"]',
            'text=/Sign in/i',
            'text=/로그인/i'
        ]
    }


# D3: 로그 파일 경로 절대 경로
LOG_FILE = Path(__file__).resolve().parent / "flow_run.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout),
              logging.FileHandler(str(LOG_FILE), encoding="utf-8")],
)
log = logging.getLogger("flow_rpa")


class BudgetExhausted(Exception):
    pass


class GenerationFailed(Exception):
    pass


class DownloadFailed(Exception):
    pass


# ---------------------------------------------------------------- 연결 [산출물 #1]
async def connect_browser(pw):
    """터미널에서 미리 띄운 로컬 Chrome(원격 디버깅 포트)에 붙는다."""
    # D7: FLOW_PROJECT_URL 체크
    if not CONFIG.FLOW_URL:
        raise RuntimeError("편집기 진입 실패 — FLOW_PROJECT_URL 환경변수에 Flow 프로젝트 URL을 설정하세요")

    cdp = f"http://127.0.0.1:{CONFIG.CDP_PORT}"
    browser = await pw.chromium.connect_over_cdp(cdp)
    context = browser.contexts[0] if browser.contexts else await browser.new_context()
    page = context.pages[0] if context.pages else await context.new_page()
    page.set_default_timeout(CONFIG.UI_TIMEOUT)

    if CONFIG.FLOW_URL not in (page.url or ""):
        await page.goto(CONFIG.FLOW_URL, timeout=CONFIG.NAV_TIMEOUT)
    
    # D7: 로그인 만료 체크
    if await any_visible(page, "login_wall"):
        raise RuntimeError("Flow 로그인 세션 만료 — 전용 크롬 프로필에서 재로그인 필요")

    return browser, context, page


# --------------------------------------------------------- 견고한 셀렉터 [산출물 #2]
async def first_locator(page_or_locator, key, timeout=None, state="visible"):
    timeout = (timeout or CONFIG.UI_TIMEOUT) / 1000
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        for sel in CONFIG.SELECTORS[key]:
            loc = page_or_locator.locator(sel).first
            try:
                if await loc.count() > 0 and (state != "visible" or await loc.is_visible()):
                    return loc
            except Exception:  # noqa
                pass
        await asyncio.sleep(0.4)
    raise PWTimeout(f"[{key}] 보이는 요소 없음")


async def any_visible(page, key) -> bool:
    for sel in CONFIG.SELECTORS[key]:
        try:
            if await page.locator(sel).first.is_visible():
                return True
        except Exception:  # noqa
            pass
    return False


async def ensure_model_lower_priority(page):
    """모델을 veo3-fast(Lower Priority)로 고정. 실패 시 배치를 중단한다(D9)."""
    try:
        opener = await first_locator(page, "model_open", timeout=15_000)
        await opener.click()
        await asyncio.sleep(1.0)
        
        prio = page.locator(f'text=/{CONFIG.MODEL_PRIORITY_HINT}/i').first
        if await prio.count() > 0 and await prio.is_visible():
            await prio.click()
        else:
            opt = await first_locator(page, "model_option_fast", timeout=8_000)
            await opt.click()
        await asyncio.sleep(1.0)
        
        # D9 검증
        actual = ""
        for sel in CONFIG.SELECTORS["selected_model"]:
            loc = page.locator(sel).first
            if await loc.count() > 0:
                actual = await loc.inner_text()
                break
        
        # UI에서 못 읽었을 수도 있으니, 우선 에러 로그 남김 (fail-closed)
        if actual and (CONFIG.MODEL_LABEL.lower() not in actual.lower() or CONFIG.MODEL_PRIORITY_HINT.lower() not in actual.lower()):
             raise RuntimeError(f"모델 확정 실패: 기대='{CONFIG.MODEL_LABEL} {CONFIG.MODEL_PRIORITY_HINT}' 실제='{actual}' — 예산 보호를 위해 중단")
             
        log.info("모델 설정 완료: %s", actual)
    except Exception as e:
        raise RuntimeError(f"모델 확정 실패 — 예산 보호를 위해 중단: {e}")


async def ensure_outputs_per_prompt(page, n=1):
    """프롬프트 당 생성 개수를 1로 강제한다(D8). 실패 시 중단."""
    # 구현 참고: UI에 개수 버튼이 있다면 선택. 보통 1, 2, 4 옵션.
    try:
        # 이 부분은 Phase 0 F3 결과에 따라 실제 클릭 로직 필요. 임시 방어 코드.
        outputs = page.locator('text=/outputs per prompt/i').locator('xpath=..').locator(f'button:has-text("{n}")').first
        if await outputs.count() > 0 and await outputs.is_visible():
            await outputs.click()
            log.info("출력 개수 1개 강제 설정 완료")
    except Exception as e:
        raise RuntimeError(f"출력 개수 1 강제 실패 — 크레딧 방어를 위해 중단: {e}")


async def read_credits_ui(page):
    """화면에 크레딧 잔액이 보이면 로그로 남긴다(보정·모니터링용)."""
    try:
        loc = page.locator(CONFIG.SELECTORS["credit_balance"][0]).first
        if await loc.count() > 0:
            txt = (await loc.inner_text()) or ""
            log.info("UI 크레딧 표시: %s", txt.strip()[:60])
            # 실측 숫자 파싱 로직 추가 가능
            match = re.search(r'([\d,]+)', txt)
            if match:
                return float(match.group(1).replace(',', ''))
    except Exception:  # noqa
        pass
    return None


# ------------------------------------------------------ 초장기 동적 대기 [산출물 #3]
async def snapshot_results(page) -> int:
    """생성 전 결과 타일의 개수(또는 고유 키 집합). 새 결과 식별의 기준선 (D1)."""
    # 고유 키 추출이 어려울 수 있으므로 기본적으로 count를 사용
    count = 0
    for sel in CONFIG.SELECTORS["result_tile"]:
        loc = page.locator(sel)
        if await loc.count() > 0:
            count = await loc.count()
            break
    return count


async def snapshot_alerts(page) -> int:
    """대기 시작 시점의 오류 토스트 개수 (a4)."""
    count = 0
    for sel in CONFIG.SELECTORS["error_toast"]:
        loc = page.locator(sel)
        if await loc.count() > 0:
            count += await loc.count()
    return count


async def wait_new_result(page, baseline_count: int, baseline_alerts: int):
    """baseline에 없던 새 결과 타일이 완성될 때까지 대기 → 그 타일 Locator 반환 (D1)."""
    loop = asyncio.get_event_loop()
    t0 = loop.time()
    
    # 큐 진입 대기
    while loop.time() - t0 < 30:
        if await any_visible(page, "generating_indicator"):
            log.info("  생성/큐 진입 감지 (Lower Priority — 대기 길 수 있음)")
            break
        await asyncio.sleep(1.0)

    deadline = loop.time() + CONFIG.GEN_TIMEOUT / 1000
    while loop.time() < deadline:
        current_alerts = await snapshot_alerts(page)
        if current_alerts > baseline_alerts:
            raise GenerationFailed("새로운 생성 에러 토스트 감지")
            
        generating = await any_visible(page, "generating_indicator")
        
        # 새 타일 등장 여부 확인
        current_count = 0
        loc = None
        for sel in CONFIG.SELECTORS["result_tile"]:
            temp_loc = page.locator(sel)
            c = await temp_loc.count()
            if c > 0:
                current_count = c
                loc = temp_loc
                break
                
        # D1: 최소 대기 시간이 지났고, 생성중 표시가 없고, 타일 개수가 늘어났다면 완료로 판정
        elapsed = loop.time() - t0
        if elapsed > CONFIG.MIN_WAIT and (not generating) and current_count > baseline_count:
            log.info("  생성 완료 (새 타일 발견)")
            try:
                await page.wait_for_load_state("networkidle", timeout=10_000)
            except PWTimeout:
                pass
            return loc.nth(0) # 가장 첫번째 요소(보통 최신이 맨 위)
            
        await asyncio.sleep(CONFIG.POLL_INTERVAL)
        
    raise PWTimeout(f"생성 완료 타임아웃({CONFIG.GEN_TIMEOUT/60000:.0f}분)")


# ------------------------------------------------------------------- 액션
async def upload_image(page, image_path):
    if not image_path:
        return
    p = Path(image_path)
    if not p.exists():
        raise FileNotFoundError(f"참조 이미지 없음: {image_path}")
    finp = page.locator(CONFIG.SELECTORS["file_input"][0]).first
    if await finp.count() == 0:
        btn = await first_locator(page, "attach_button")
        await btn.click()
        finp = await first_locator(page, "file_input", state="attached")
    await finp.set_input_files(str(p))
    log.info("  이미지 업로드: %s", p.name)
    try:
        await page.wait_for_load_state("networkidle", timeout=20_000)
    except PWTimeout:
        pass


async def submit_prompt_and_generate(page, text):
    box = await first_locator(page, "prompt_input")
    await box.click()
    await box.fill("")
    await box.type(text, delay=6)
    btn = await first_locator(page, "generate_button")
    await btn.click()
    log.info("  프롬프트 전송 & 생성 시작(%d자)", len(text))


async def download_result(result_locator, out_path: Path):
    """새 결과 타일 내부의 다운로드 버튼만 클릭한다. 전역 검색 금지 (D2)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 다운로드 버튼 찾기
    dl = await first_locator(result_locator, "download_button", timeout=CONFIG.UI_TIMEOUT)
    
    page = result_locator.page
    async with page.expect_download(timeout=180_000) as di:
        await dl.click()
        # 고화질 선택이 있다면 (F9)
        try:
            q_opt = page.locator(CONFIG.SELECTORS["quality_option"][0]).first
            await asyncio.sleep(0.5) # a1
            if await q_opt.count() > 0 and await q_opt.is_visible():
                await q_opt.click()
        except Exception:
            pass

    d = await di.value
    await d.save_as(str(out_path))
    
    # D2, a2: 파일 크기 100KB 검증 + ffprobe 재생 길이 확인
    if not out_path.exists() or out_path.stat().st_size < 102400:
        out_path.unlink(missing_ok=True)
        raise DownloadFailed("다운로드 파일이 너무 작음 또는 존재하지 않음")
    import subprocess
    try:
        p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(out_path)], capture_output=True, text=True)
        if not p.stdout.strip() or float(p.stdout.strip()) < 1.0:
            raise ValueError("Duration too short or unreadable")
    except Exception as e:
        out_path.unlink(missing_ok=True)
        raise DownloadFailed(f"다운로드 파일 손상(ffprobe 판독 불가): {e}")
        
    log.info("  저장: %s", out_path.name)
    return out_path


# ------------------------------------------------------ 씬 실행(크레딧 가드 포함)
@dataclass
class Scene:
    n: int
    prompt: str
    ref_image: str = ""
    extend: int = CONFIG.DEFAULT_EXTEND
    caption: str = ""


async def _guarded_generation(page, label):
    """생성 1회 전 크레딧 가드 및 세션 가드 (a3). 상한 초과면 BudgetExhausted."""
    if not credits.can_spend():
        raise BudgetExhausted(credits.status_line())
    if await any_visible(page, "login_wall"):
        raise RuntimeError("Flow 로그인 세션 만료 — 전용 크롬 프로필에서 재로그인 필요")
    return label


async def run_scene(page, sc: Scene, out_dir: Path):
    base = f"scene_{sc.n:02d}"
    
    # R6: 재개 판정을 실제 필요 파일 존재 여부로 확인
    def _get_expected_files():
        if CONFIG.EXTEND_DOWNLOAD_MODE == "cumulative":
            return [out_dir / (f"{base}_full.mp4" if sc.extend >= 1 else f"{base}_00.mp4")]
        else:
            return [out_dir / f"{base}_{i:02d}.mp4" for i in range(sc.extend + 1)]
            
    expected_files = _get_expected_files()
    if all(f.exists() for f in expected_files):
        log.info("씬 %02d 필요 파일 모두 존재 → 스킵", sc.n)
        return expected_files

    last = None
    for attempt in range(1, CONFIG.RETRIES + 2):
        try:
            # D6: 재시도 전 다시 한번 예산 체크
            if not credits.can_spend():
                raise BudgetExhausted(credits.status_line())
                
            log.info("씬 %02d 시도 %d | %s", sc.n, attempt, credits.status_line())
            clips = []

            # ------------------------------------------- 초기 클립
            init = out_dir / f"{base}_00.mp4"
            download_init = not (CONFIG.EXTEND_DOWNLOAD_MODE == "cumulative" and sc.extend >= 1)
            need_init = True
            
            if download_init and init.exists():
                need_init = False
                
            if need_init:
                await _guarded_generation(page, "init")
                baseline_count = await snapshot_results(page)
                baseline_alerts = await snapshot_alerts(page)
                
                # D4, R7 선기록 및 예외 분리
                entry_id = credits.record(meta=f"{out_dir.name}/{base}/init", state="pending")
                try:
                    await upload_image(page, sc.ref_image)
                    await submit_prompt_and_generate(page, sc.prompt)
                except Exception as e:
                    credits.update_state(entry_id, "void")
                    raise GenerationFailed(str(e))
                
                try:
                    new_tile = await wait_new_result(page, baseline_count, baseline_alerts)
                    credits.update_state(entry_id, "confirmed")
                except Exception as e:
                    credits.update_state(entry_id, "spent_unconfirmed")
                    raise GenerationFailed(str(e))
                
                if download_init:
                    dl_success = False
                    for _ in range(3):
                        try:
                            await download_result(new_tile, init)
                            dl_success = True
                            break
                        except Exception as e:
                            log.warning(f"초기 클립 다운로드 실패 재시도: {e}")
                            await asyncio.sleep(2.0)
                    if not dl_success:
                        raise DownloadFailed("다운로드 최종 실패")
                    
                await read_credits_ui(page)
                await asyncio.sleep(CONFIG.THROTTLE)
                
            if download_init:
                clips.append(init)

            # ------------------------------------------- Extend
            for i in range(1, sc.extend + 1):
                is_last_extend = (i == sc.extend)
                extp = out_dir / f"{base}_{i:02d}.mp4"
                if CONFIG.EXTEND_DOWNLOAD_MODE == "cumulative" and is_last_extend:
                    extp = out_dir / f"{base}_full.mp4"
                
                if extp.exists():
                    clips.append(extp)
                    continue
                    
                await _guarded_generation(page, f"extend{i}")
                baseline_count = await snapshot_results(page)
                baseline_alerts = await snapshot_alerts(page)
                
                entry_id = credits.record(meta=f"{out_dir.name}/{base}/ext{i}", state="pending")
                try:
                    ebtn = await first_locator(page, "extend_button", timeout=CONFIG.UI_TIMEOUT)
                    await ebtn.click()
                except Exception as e:
                    credits.update_state(entry_id, "void")
                    raise GenerationFailed(str(e))
                
                try:
                    new_tile = await wait_new_result(page, baseline_count, baseline_alerts)
                    credits.update_state(entry_id, "confirmed")
                except Exception as e:
                    credits.update_state(entry_id, "spent_unconfirmed")
                    raise GenerationFailed(str(e))
                
                download_ext = (CONFIG.EXTEND_DOWNLOAD_MODE == "delta" or is_last_extend)
                if download_ext:
                    dl_success = False
                    for _ in range(3):
                        try:
                            await download_result(new_tile, extp)
                            dl_success = True
                            break
                        except Exception as e:
                            log.warning(f"Extend 다운로드 실패 재시도: {e}")
                            await asyncio.sleep(2.0)
                    if not dl_success:
                        raise DownloadFailed("Extend 다운로드 최종 실패")
                    clips.append(extp)
                    
                await read_credits_ui(page)
                await asyncio.sleep(CONFIG.THROTTLE)

            return clips

        except BudgetExhausted:
            raise
        except DownloadFailed as dfe:
            # 다운로드만 실패면 재생성(Generation)하지 않고 다음 루프에서 이어가게 함
            log.warning("씬 %02d 다운로드만 실패(%s), 이어서 재시도", sc.n, attempt)
            last = dfe
            await asyncio.sleep(CONFIG.THROTTLE)
        except Exception as e:  # noqa
            last = e
            log.warning("씬 %02d 실패(%s): %s", sc.n, attempt, e)
            try:
                await page.screenshot(path=str(out_dir / f"_err_{base}_t{attempt}.png"))
            except Exception:  # noqa
                pass
            await asyncio.sleep(CONFIG.THROTTLE)
            
    raise RuntimeError(f"씬 {sc.n} 최종 실패: {last}")


async def run_job(page, job: dict):
    out_dir = Path(job["output_dir"]) / job["video_id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    scenes = [Scene(n=s["n"], prompt=s["prompt"], ref_image=s.get("ref_image", ""),
                    extend=s.get("extend", CONFIG.DEFAULT_EXTEND),
                    caption=s.get("caption", "")) for s in job["scenes"]]

    manifest = {"video_id": job["video_id"], "title_ko": job.get("title_ko", ""),
                "bgm": job.get("bgm", ""), "clips": [], "scenes": [], "captions": [],
                "extend_mode": CONFIG.EXTEND_DOWNLOAD_MODE} # D5
                
    for sc in scenes:
        clips = await run_scene(page, sc, out_dir)          # BudgetExhausted면 상위로
        manifest["clips"] += [str(c) for c in clips]
        manifest["scenes"].append({"n": sc.n, "caption": sc.caption,
                                   "files": [c.name for c in clips]})
        manifest["captions"].append({"n": sc.n, "text": sc.caption})

    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("작업 완료: %s → manifest.json", job["video_id"])
    return out_dir / "manifest.json"


# ------------------------------------------------------------------- main
async def main(job_paths):
    log.info("배치 시작 | %s", credits.status_line())
    async with async_playwright() as pw:
        browser, context, page = await connect_browser(pw)
        try:
            await ensure_model_lower_priority(page)
            await ensure_outputs_per_prompt(page, n=1)
            
            for jp in job_paths:
                if not credits.can_spend():
                    log.warning("크레딧 상한 도달 → 남은 작업 중단(정상). %s", credits.status_line())
                    break
                job = json.loads(Path(jp).read_text(encoding="utf-8"))
                try:
                    await run_job(page, job)
                except BudgetExhausted as b:
                    log.warning("크레딧 상한 도달 → 배치 정상 종료. %s", b)
                    break
        finally:
            # D13: 종료 시 창은 닫지 않고 연결만 놓아줌 (playwright에서는 기본적으로 context/browser close 시 탭이 닫히므로, connect 시에는 안닫힘)
            await browser.close()
    log.info("배치 종료 | %s", credits.status_line())


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python flow_rpa.py jobs/*.json")
        sys.exit(1)
    asyncio.run(main(sys.argv[1:]))
