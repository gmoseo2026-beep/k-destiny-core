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

# automation/.env 자동 로드 (FLOW_PROJECT_URL 등 환경변수)
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")


class CONFIG:
    FLOW_URL = os.environ.get("FLOW_PROJECT_URL", "")  # D7
    CDP_PORT = os.environ.get("CDP_PORT", "9222")     # 로컬 크롬 원격 디버깅 포트

    MODEL_LABEL = os.environ.get("FLOW_MODEL", "Veo 3.1 - Lite")
    MODEL_FORBIDDEN = ["Quality", "Lower Priority", "Omni Flash"]
    MENU_FORBIDDEN = ["Publish to YouTube", "Move to trash", "Share", "Flag output"]
    QUALITY_FORBIDDEN = ["4K"]

    # Phase 0.5(다운로드 동작·DOM·실단가) 확인 및 반영 후 True 로 변경할 것.
    PHASE0_VERIFIED = True

    DEFAULT_EXTEND = 0                     # 기본 연장 0회 (다중 씬 구조로 대체)
    EXTEND_DOWNLOAD_MODE = "cumulative"

    # 타임아웃(ms) — Lower Priority 큐 대비 매우 넉넉하게
    NAV_TIMEOUT = 120_000
    UI_TIMEOUT = 45_000
    GEN_TIMEOUT = 1_800_000               # 30분: 큐+렌더 최악 대비
    POLL_INTERVAL = 8.0                   # 완료 폴링 간격(초) — 긴 작업이라 느긋하게
    THROTTLE = 6.0                        # 작업 간 최소 간격
    MIN_WAIT = 20.0                       # 최소 대기 시간 (D1)

    RETRIES = 2


    VIDEO_SECTION = 'text=/Video generation default|동영상 생성 기본값/i >> xpath=..'
    IMAGE_SECTION = 'text=/Image generation default|이미지 생성 기본값/i >> xpath=..'

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
            'button:has-text("Create"):has(i:has-text("arrow_forward"))',
            'button:has-text("Generate")',
            'button:has-text("생성")',
            'button[aria-label*="generate" i]'
        ],
        "attach_button": [
            'button[aria-label*="image" i]',
            'button[aria-label*="frame" i]',
            'button[aria-label*="ingredient" i]',
            'button[aria-label*="add" i]',
            'button:has-text("Frames")',
        ],
        "file_input": ['input[type="file"]'],

        "settings_open": ['button:has-text("tune")'],
        "confirm_auto":  ['button[role="radio"][value="AUTO_APPROVE"]'],
        "profile_open":  ['button:has(img[alt="User profile image"])'],
        "credit_text":   ['a:has-text("Google Flow credits")'],

        # 생성 중 표시(스피너/큐/진행률/"Generating"/"Pending"/"In queue")
        "generating_indicator": [
            'text=/generating|pending|in queue|rendering|처리 중|대기/i',
            '[role="progressbar"]',
            '.loading, .spinner',
            'text=/[0-9]+%/',
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
            '[data-tile-id]',
            'video',
            'img[src^="blob:"]'
        ],
        "tile_menu": [
            'button:has-text("more_vert")',
            'button:has-text("More options")',
            'button[aria-haspopup="menu"]'
        ],
        "menu_download": [
            '[role="menuitem"]:has-text("Download")',
            'div:has-text("Download")',
            'span:has-text("Download")'
        ],
        # 품질 선택
        "quality_option": [
            '[role="menuitem"]:has-text("1080p")',
            'div:has-text("1080p")',
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
    else:
        # 이미 URL에 있더라도 No session found 상태면 리로드
        text = await page.evaluate('document.body.innerText')
        if 'No session found' in text:
            log.warning("세션 만료 모달 감지 ('No session found') — 페이지 리로드")
            await page.reload(timeout=CONFIG.NAV_TIMEOUT)
            
    # D7: 로그인 만료 체크
    if await any_visible(page, "login_wall"):
        raise RuntimeError("Flow 로그인 세션 만료 — 전용 크롬 프로필에서 재로그인 필요")

    await dismiss_all_modals(page)

    return browser, context, page


async def dismiss_all_modals(page):
    """화면을 가리는 모든 팝업/모달/오버레이를 닫는다.
    - Google Labs 동의("Agree"), 업로드 저작권 경고("I agree"),
      또는 이전 실행 크래시로 남은 오버레이(data-state="open") 등."""
    # 1) "I agree" 버튼 (업로드 Notice 모달 — 더 구체적인 것 먼저)
    for btn_text in ["I agree", "Agree", "No thanks"]:
        try:
            btn = page.locator(f'button:has-text("{btn_text}")').first
            if await btn.count() > 0 and await btn.is_visible():
                await btn.click()
                await asyncio.sleep(1.0)
                log.info("모달 닫음: %s", btn_text)
        except Exception:
            pass

    # 2) data-state="open" 오버레이가 남아있으면 Escape로 닫기
    for _ in range(3):
        try:
            overlay = page.locator('div[data-state="open"][aria-hidden="true"]').first
            if await overlay.count() > 0 and await overlay.is_visible():
                await page.keyboard.press("Escape")
                await asyncio.sleep(0.5)
            else:
                break
        except Exception:
            break


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
async def snapshot_results(page) -> set:
    """생성 전 비디오 소스(src) 집합을 기록. (타일 개수는 UI에 의해 줄어들 수 있으므로 src로 추적)"""
    videos = await page.locator('video').all()
    srcs = set()
    for v in videos:
        src = await v.get_attribute('src')
        if src:
            srcs.add(src)
    return set(srcs)

async def snapshot_alerts(page) -> int:
    """대기 시작 시점의 오류 토스트 개수 (a4)."""
    count = 0
    for sel in CONFIG.SELECTORS["error_toast"]:
        loc = page.locator(sel)
        if await loc.count() > 0:
            count += await loc.count()
    return count

async def wait_new_result(page, baseline_srcs: set, baseline_alerts: int):
    """baseline에 없던 새 비디오 src가 등장할 때까지 대기 → 그 부모 요소 반환."""
    loop = asyncio.get_event_loop()
    t0 = loop.time()
    
    # GCS URL 캡처 리스너
    captured_storage_url = None
    async def on_response(response):
        nonlocal captured_storage_url
        if "media.getMediaUrlRedirect" in response.url and response.status in (301, 302, 303, 307, 308):
            loc = response.headers.get("location")
            if loc and "storage.googleapis.com" in loc:
                captured_storage_url = loc
                log.info(f"  [디버그] 302 Redirect URL 캡처 성공!")
    
    page.on("response", on_response)
    
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
            page.remove_listener("response", on_response)
            raise GenerationFailed("새로운 생성 에러 토스트 감지")
            
        elapsed = loop.time() - t0
        if elapsed > CONFIG.MIN_WAIT:
            # 모든 비디오 태그 검사
            videos = await page.locator('video').all()
            for v in videos:
                src = await v.get_attribute('src')
                if src and src not in baseline_srcs:
                    log.info("  생성 완료 (새 비디오 소스 감지)")
                    try:
                        await page.wait_for_load_state("networkidle", timeout=10_000)
                    except PWTimeout:
                        pass
                    
                    # 캡처 대기 (최대 15초)
                    for _ in range(15):
                        if captured_storage_url:
                            break
                        await asyncio.sleep(1.0)
                        
                    tile = v.locator('xpath=..')
                    if captured_storage_url:
                        await tile.evaluate(f'(el) => el.setAttribute("data-gcs-url", "{captured_storage_url}")')
                    
                    page.remove_listener("response", on_response)
                    return tile
            
        await asyncio.sleep(CONFIG.POLL_INTERVAL)
        
    page.remove_listener("response", on_response)
    raise PWTimeout(f"생성 완료 타임아웃({CONFIG.GEN_TIMEOUT/60000:.0f}분)")


# ------------------------------------------------------------------- 액션
async def upload_image(page, image_path):
    if not image_path:
        return
    p = Path(image_path)
    if not p.exists():
        raise FileNotFoundError(f"참조 이미지 없음: {image_path}")

    # 1. 프롬프트 입력란의 하단 '+' 버튼(add 아이콘) 클릭
    try:
        btns = await page.locator('button:has(i:has-text("add")), button[aria-label*="image" i]').all()
        clicked_plus = False
        for b in btns:
            if await b.is_visible():
                bb = await b.bounding_box()
                # 하단 프롬프트 박스의 y 좌표는 보통 700 이상
                if bb and bb['y'] > 600:
                    await b.click(force=True)
                    log.info("  프롬프트 '+' 버튼 클릭 (미디어 팝업 열기)")
                    clicked_plus = True
                    break
        if not clicked_plus:
            # 못 찾으면 보이는 첫번째 거라도 클릭 시도
            add_btn = page.locator('button:has(i:has-text("add_2")), button[aria-label*="image" i]').first
            if await add_btn.is_visible():
                await add_btn.click(force=True)
        await asyncio.sleep(2.0)
    except Exception as e:
        log.debug(f"  '+' 버튼 클릭 실패: {e}")

    # 2. Upload media 버튼 클릭 및 파일 업로드
    try:
        async with page.expect_file_chooser(timeout=5000) as fc_info:
            upload_btn = page.locator('button:has-text("Upload media")').first
            await upload_btn.click(force=True)
        file_chooser = await fc_info.value
        await file_chooser.set_files(str(p))
        log.info("  이미지 업로드 시작: %s", p.name)
        await asyncio.sleep(3.0)
    except Exception as e:
        log.warning(f"  파일 선택창 대기 실패 (기존 이미지 선택 시도): {e}")

    # 업로드 시 등장하는 저작권 동의 모달(Notice) 닫기
    for _ in range(4):
        try:
            i_agree = page.locator('button:has-text("I agree")').first
            if await i_agree.count() > 0 and await i_agree.is_visible():
                await i_agree.click(force=True)
                await asyncio.sleep(1.0)
                log.info("  업로드 동의 모달 닫음")
                break
        except Exception:
            pass
        await asyncio.sleep(0.5)

    # 3. 팝업 내 최근 업로드된 썸네일(첫 번째 이미지) 클릭
    try:
        modal = page.locator('div[role="dialog"]').first
        first_img = modal.locator('img').first
        if await first_img.count() > 0 and await first_img.is_visible():
            await first_img.click(force=True)
            await asyncio.sleep(1.0)
            log.info("  업로드된 이미지 썸네일 선택")
    except Exception as e:
        log.debug(f"  썸네일 선택 실패: {e}")

    # 4. "Add to Prompt" 버튼이 활성화될 때까지 기다렸다가 클릭
    clicked_add = False
    atp = page.locator('button:has-text("Add to Prompt")').first
    for attempt in range(15):
        try:
            if await atp.count() > 0 and await atp.is_visible():
                if not await atp.is_disabled():
                    await atp.click(force=True)
                    await asyncio.sleep(2.0)
                    log.info("  'Add to Prompt' 클릭 완료")
                    clicked_add = True
                    break
        except Exception as e:
            pass
        await asyncio.sleep(1.0)

    if not clicked_add:
        log.warning("  'Add to Prompt' 버튼을 클릭하지 못했습니다.")

    # 미디어 라이브러리 팝업이 아직 열려있다면 닫기 (Escape)
    for _ in range(3):
        try:
            # 팝업이 열려있는지 확인 (Add to Prompt 버튼이나 Upload media 버튼이 여전히 보이면)
            popup = page.locator('div[role="dialog"]').first
            if await popup.count() > 0 and await popup.is_visible():
                await page.keyboard.press("Escape")
                await asyncio.sleep(0.5)
            else:
                break
        except:
            pass


async def submit_prompt_and_generate(page, text):
    # 모달이 남아있으면 제거
    await dismiss_all_modals(page)
    box = await first_locator(page, "prompt_input")
    
    # 이미지가 첨부되어 있으므로 Control+A, Backspace, fill()을 사용하면 
    # 첨부된 이미지가 지워지거나 에디터 상태가 깨질 수 있음
    await box.focus()
    await asyncio.sleep(0.5)
    
    # 키보드 타이핑으로 안전하게 입력
    await page.keyboard.type(text, delay=10)
    await asyncio.sleep(1.0)
    btn = await first_locator(page, "generate_button")
    await btn.click()
    log.info("  프롬프트 전송 & 생성 시작(%d자)", len(text))


async def download_result(result_locator, out_path: Path):
    """결과 타일에서 캡처된 GCS URL을 읽거나, 실패 시 UI 다운로드를 시도합니다."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    page = result_locator.page
    
    # 먼저 DOM에 심어둔 GCS URL이 있는지 확인합니다.
    gcs_url = await result_locator.evaluate('(el) => el.getAttribute("data-gcs-url")')
    if gcs_url:
        log.info("  인터셉트된 GCS URL로 직접 다운로드 시도...")
        vid_resp = await page.context.request.get(gcs_url)
        if vid_resp.ok:
            data = await vid_resp.body()
            out_path.write_bytes(data)
            log.info("  다운로드 완료 (%d bytes)", len(data))
            
            # ffprobe 검증
            import subprocess
            try:
                p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(out_path)], capture_output=True, text=True)
                if not p.stdout.strip() or float(p.stdout.strip()) < 1.0:
                    raise ValueError("Duration too short or unreadable")
            except Exception as e:
                out_path.unlink(missing_ok=True)
                log.warning(f"  다운로드 파일 손상(ffprobe 판독 불가): {e}")
            else:
                log.info("  저장: %s", out_path.name)
                return out_path
        else:
            log.warning("  GCS 직접 다운로드 실패, UI Fallback 시도")
    
    # UI 폴백 시도
    log.warning("  UI 기반 다운로드 시도 (수동 개입 필요)")
    
    tile_with_btn = result_locator.locator('xpath=ancestor-or-self::div[button[@aria-haspopup="menu"]]').last
    if await tile_with_btn.count() == 0:
        tile_with_btn = page.locator('div:has(video):has(button[aria-haspopup="menu"])').last
    
    if await tile_with_btn.count() == 0:
        raise DownloadFailed("다운로드 메뉴 버튼이 있는 타일을 찾을 수 없습니다.")
        
    await tile_with_btn.hover(force=True)
    await asyncio.sleep(0.5)
    
    more_btn = tile_with_btn.locator('button[aria-haspopup="menu"]').last
    if await more_btn.count() == 0:
        raise DownloadFailed("다운로드 메뉴 버튼을 찾을 수 없습니다.")
        
    await more_btn.click(force=True)
    await asyncio.sleep(0.5)
    
    dl_menu = page.locator('[role="menuitem"]:has-text("Download"), div:has-text("Download")').first
    if await dl_menu.count() == 0:
        raise DownloadFailed("다운로드(Download) 메뉴 항목을 찾을 수 없습니다.")
        
    import os, time, shutil
    dl_dir = Path(os.path.expanduser("~")) / "Downloads"
    mp4s_before = {p: p.stat().st_mtime for p in dl_dir.glob("*.mp4")}
    
    log.info("  다운로드 트리거 (UI Click)")
    await dl_menu.hover(force=True)
    await asyncio.sleep(0.5)
    await dl_menu.click(force=True)
    
    try:
        import pyautogui
        try:
            import pygetwindow as gw
            win = gw.getActiveWindow()
            if win: win.activate()
        except:
            pass
        pyautogui.FAILSAFE = False
        await asyncio.sleep(1.5)
        pyautogui.press('enter')
        log.info("  다이얼로그 Enter 키 전송 (pyautogui)")
    except Exception as e:
        log.warning(f"  pyautogui 실행 실패: {e}")
        
    log.info("  Downloads 폴더 모니터링 중...")
    new_file = None
    for _ in range(60): 
        await asyncio.sleep(1)
        mp4s_now = {p: p.stat().st_mtime for p in dl_dir.glob("*.mp4")}
        for p, mtime in mp4s_now.items():
            if p not in mp4s_before or mtime > mp4s_before.get(p, 0):
                new_file = p
                break
        if new_file:
            break
            
    if not new_file:
        raise DownloadFailed("시스템 Downloads 폴더에서 새 파일 감지 실패")
        
    last_size = -1
    for _ in range(30):
        await asyncio.sleep(1)
        size = new_file.stat().st_size
        if size == last_size and size > 102400: 
            break
        last_size = size
        
    shutil.move(str(new_file), str(out_path))
    log.info("  다운로드 완료 및 이동: %s", out_path.name)
    
    import subprocess
    try:
        p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(out_path)], capture_output=True, text=True)
        if not p.stdout.strip() or float(p.stdout.strip()) < 1.0:
            raise ValueError("Duration too short or unreadable")
    except Exception as e:
        out_path.unlink(missing_ok=True)
        raise DownloadFailed(f"다운로드 파일 손상(ffprobe 판독 불가): {e}")


# ------------------------------------------------------ 설정 패널 [run_batch.py 호출]

def _norm(s: str) -> str:
    """비교용 정규화: 소문자 + 공백·하이픈·점·대괄호 제거"""
    return re.sub(r"[\s\-\.\[\]_]", "", (s or "").lower())


async def read_selected_model(page) -> str:
    """Video generation 섹션에서 현재 선택된 모델명을 읽는다."""
    sec = page.locator(CONFIG.VIDEO_SECTION)
    btn = sec.locator('button[aria-haspopup="menu"]').last
    if await btn.count() > 0:
        return (await btn.inner_text()).strip().split("\n")[0].strip()
    return ""


async def ensure_model(page):
    """모델을 CONFIG.MODEL_LABEL로 고정. 실패 시 배치를 중단한다(fail-closed)."""
    try:
        sec = page.locator(CONFIG.VIDEO_SECTION)
        btn = sec.locator('button[aria-haspopup="menu"]').last
        if await btn.count() > 0 and await btn.is_visible():
            await btn.click()
            await asyncio.sleep(0.8)
            target_opt = page.locator(f'[role="menuitem"]:text-is("{CONFIG.MODEL_LABEL}")').first
            if await target_opt.count() > 0 and await target_opt.is_visible():
                await target_opt.click()
                await asyncio.sleep(0.8)
            else:
                try:
                    await page.keyboard.press("Escape")
                except Exception:
                    pass
        actual = await read_selected_model(page)
        if not actual:
            raise RuntimeError("모델 확정 실패: 선택된 모델을 UI에서 읽지 못함")
        if _norm(CONFIG.MODEL_LABEL) != _norm(actual):
            raise RuntimeError(f"모델 확정 실패: 기대='{CONFIG.MODEL_LABEL}' 실제='{actual}'")
        for bad in CONFIG.MODEL_FORBIDDEN:
            if _norm(bad) in _norm(actual):
                raise RuntimeError(f"금지 모델 선택됨('{actual}') — 즉시 중단")
        log.info("모델 설정 완료: %s", actual)
    except Exception as e:
        raise RuntimeError(f"모델 확정 실패 — 예산 보호를 위해 중단: {e}")


async def ensure_auto_approve(page):
    """Confirm before generating = Never(AUTO_APPROVE) 강제. 실패 시 중단."""
    el = await first_locator(page, "confirm_auto", timeout=5000)
    if not el:
        raise RuntimeError("Confirm-before-generating 설정을 찾지 못함 — 중단")
    if await el.get_attribute("aria-checked") != "true":
        await el.click()
        await asyncio.sleep(0.5)
    if await el.get_attribute("aria-checked") != "true":
        raise RuntimeError("자동 승인(Never) 설정 실패 — 중단")
    log.info("자동 승인(Never) 확인됨")


async def _ensure_outputs_section(page, n=1):
    """출력 개수를 1x로 강제. IMAGE_SECTION도 1x로 강제 (크레딧 2배 방어)."""
    try:
        v_sec = page.locator(CONFIG.VIDEO_SECTION)
        v_tab = v_sec.get_by_role("tab", name=f"{n}x" if n == 1 else f"x{n}", exact=True)
        if await v_tab.count() > 0 and await v_tab.get_attribute("data-state") != "active":
            await v_tab.click()
            await asyncio.sleep(0.4)
        v_st = await v_tab.get_attribute("data-state") if await v_tab.count() > 0 else "unknown"
        if v_st != "active":
            raise RuntimeError(f"Video 출력 개수 {n}x 강제 실패 (state={v_st})")

        i_sec = page.locator(CONFIG.IMAGE_SECTION)
        i_tab = i_sec.get_by_role("tab", name="1x", exact=True)
        if await i_tab.count() > 0 and await i_tab.get_attribute("data-state") != "active":
            await i_tab.click()
            await asyncio.sleep(0.4)
        log.info("출력 개수 강제 설정 완료 (Video %dx, Image 1x)", n)
    except Exception as e:
        log.warning("출력 개수 설정 스킵 (UI 변경 가능) -- 기본값 1x 가정: %s", e)


async def _close_settings_panel(page):
    """Agent settings 패널을 닫는다.
    Save 버튼은 패널 내부이므로 위치 무관하게 클릭.
    Back/Close는 좌상단 Go Back(x=24)과 구분하기 위해 x>700 필터."""
    for attempt in range(5):
        # 패널이 이미 닫혔는지 확인
        try:
            ca = page.locator(CONFIG.SELECTORS["confirm_auto"][0]).first
            if await ca.count() == 0 or not await ca.is_visible():
                return  # 패널 닫힘
        except Exception:
            return

        # 1순위: Save 버튼 (위치 무관, 패널 전용)
        clicked = False
        try:
            save_btn = page.locator('button:has-text("Save")').first
            if await save_btn.count() > 0 and await save_btn.is_visible():
                await save_btn.click()
                await asyncio.sleep(1.0)
                clicked = True
        except Exception:
            pass

        if not clicked:
            # 2순위: Back/Close (x>700만)
            for btn_text in ["Close", "Back"]:
                try:
                    btns = await page.locator(f'button:has-text("{btn_text}")').all()
                    for b in btns:
                        if not await b.is_visible():
                            continue
                        bb = await b.bounding_box()
                        if bb and bb['x'] > 700:
                            await b.click()
                            await asyncio.sleep(0.8)
                            clicked = True
                            break
                except Exception:
                    pass
                if clicked:
                    break

        if not clicked:
            # 최종 폴백: Escape
            try:
                await page.keyboard.press("Escape")
                await asyncio.sleep(0.8)
            except Exception:
                pass


async def ensure_flow_settings(page):
    """Agent settings 패널을 열어 모델·출력개수·자동승인을 확정하고 다시 닫는다.
    배치 시작 시 1회 + job 시작마다 1회 호출."""
    # 0) 이전 실행 크래시로 남은 모달/오버레이 제거
    await dismiss_all_modals(page)
    # 1) 패널이 이미 열려있는지 확인 (이전 실패로 인해 열려있을 수 있음)
    is_open = False
    try:
        await first_locator(page, "confirm_auto", timeout=2000)
        is_open = True
    except Exception:
        pass

    if not is_open:
        btn = await first_locator(page, "settings_open", timeout=30_000)
        await btn.click()
        # 패널 렌더링 대기 (언어 중립적인 AUTO_APPROVE 라디오 버튼을 기다림)
        try:
            await first_locator(page, "confirm_auto", timeout=5000)
        except Exception:
            raise RuntimeError("Agent settings 패널이 열렸으나 내용을 렌더링하지 못함 — 중단")
    try:
        await ensure_auto_approve(page)
        await ensure_model(page)
        await _ensure_outputs_section(page, 1)
    finally:
        # 패널 닫기 — 사이드바(x>1050) 버튼만 클릭
        # ⚠️ page에 Back이 2개(좌상단 "Go Back" x=24 + 사이드바 "Back" x=1091)
        # .first는 좌상단을 잡아 프로젝트에서 나가므로, 반드시 bounding_box로 필터링
        await _close_settings_panel(page)

        # 프롬프트 입력란이 다시 보이는지 최종 검증
        try:
            box = await first_locator(page, "prompt_input", timeout=3000)
            if not box:
                log.warning("설정 패널 닫기 후 프롬프트 입력란 미표시 -- 재시도")
                await _close_settings_panel(page)
        except Exception:
            pass


async def dismiss_upload_notice(page):
    """이미지 업로드 시 등장하는 권한 동의 모달(Notice / I agree) 닫기."""
    try:
        i_agree = page.locator('button:has-text("I agree")').first
        if await i_agree.count() > 0 and await i_agree.is_visible():
            await i_agree.click()
            await asyncio.sleep(1.0)
            log.info("  업로드 동의 모달 닫음")
    except Exception:
        pass


# ------------------------------------------------------ 씬 실행(크레딧 가드 포함)
@dataclass
class Scene:
    n: int
    prompt: str
    ref_image: str = ""
    extend: int = CONFIG.DEFAULT_EXTEND
    caption: str = ""
    vo: dict = None
    subs: dict = None
    speaker: str = ""


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
                    caption=s.get("caption", ""),
                    vo=s.get("vo"), subs=s.get("subs"), speaker=s.get("speaker", "")) for s in job["scenes"]]

    manifest = {"video_id": job["video_id"], "title_ko": job.get("title_ko", ""),
                "bgm": job.get("bgm", ""), "clips": [], "scenes": [], "captions": [],
                "extend_mode": CONFIG.EXTEND_DOWNLOAD_MODE} # D5
                
    for sc in scenes:
        clips = await run_scene(page, sc, out_dir)          # BudgetExhausted면 상위로
        manifest["clips"] += [str(c) for c in clips]
        manifest["scenes"].append({"n": sc.n, "caption": sc.caption,
                                   "files": [c.name for c in clips],
                                   "vo": sc.vo, "subs": sc.subs, "speaker": sc.speaker})
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
