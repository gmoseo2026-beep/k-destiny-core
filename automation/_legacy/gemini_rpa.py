#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gemini_rpa.py — Veo 3 / Nano Banana 2 (Gemini 웹 UI) RPA 자동화 파이프라인
=====================================================================
Dolphin Antidetect 브라우저의 기존 로그인 세션(CDP 디버깅 포트)에 Playwright로 붙어
작업 지시서(JSON)를 읽어 이미지 업로드 → 프롬프트 주입 → 동적 대기 → 다운로드 →
(선택) Extend 반복까지 사람 개입 없이 수행한다. 병합/자막/BGM은 assemble.py 담당.

핵심 설계 원칙
- 셀렉터는 CONFIG.SELECTORS 한 곳에만. UI가 바뀌면 여기만 고친다(로직 불변).
- 고정 sleep 금지. 스피너 소멸 + 결과물/다운로드 어포던스 등장으로 완료를 판정.
- 무인 대량 생산 대비: 재시도, 실패 스크린샷, 체크포인트(이미 받은 씬 스킵), 매니페스트.

⚠️ 주의: 이 스크립트는 '본인이 구독한 Gemini Ultra 세션'을 브라우저에서 자동 조작한다.
   API 미사용이라 추가 과금은 없지만, 소비자 웹 UI 자동화는 서비스 약관상 회색지대이며
   과도한 호출 시 계정 제한/일시 차단 위험이 있다. 호출 간격(THROTTLE)을 두고 신중히 쓸 것.
"""

import asyncio
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

import requests  # Dolphin Local API 호출용 (pip install requests)
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

# ----------------------------------------------------------------------------
# 0. 설정 (여기만 환경에 맞게 수정)
# ----------------------------------------------------------------------------
class CONFIG:
    # --- Dolphin Antidetect Local API ---
    DOLPHIN_API = "http://localhost:3001"       # Dolphin Anty 로컬 API 기본 주소
    DOLPHIN_PROFILE_ID = os.environ.get("DOLPHIN_PROFILE_ID", "")  # 프로필 ID
    # 이미 CDP 포트를 아는 경우(=Dolphin을 수동으로 켜둔 경우) 이 값을 채우면 API 호출 생략
    CDP_PORT_OVERRIDE = os.environ.get("CDP_PORT", "")

    GEMINI_URL = "https://gemini.google.com/app"

    # --- 타임아웃(초) ---
    NAV_TIMEOUT = 60
    UI_TIMEOUT = 30          # 일반 요소 대기
    GEN_TIMEOUT_IMAGE = 240  # Nano Banana 이미지 생성 최대 대기
    GEN_TIMEOUT_VIDEO = 900  # Veo3 영상 생성 최대 대기(수 분 소요)
    POLL_INTERVAL = 2.0      # 완료 폴링 간격
    THROTTLE = 4.0           # 작업 간 최소 간격(계정 보호)

    RETRIES = 2              # 씬 단위 재시도 횟수

    # --- 셀렉터 후보 (텍스트/역할/구조 기반, 위→아래 순으로 시도) ---
    # UI가 바뀌면 이 리스트에 새 후보를 '추가'만 하면 로직은 안 부서진다.
    SELECTORS = {
        # 프롬프트 입력창
        "prompt_input": [
            'div[contenteditable="true"][role="textbox"]',
            'rich-textarea div[contenteditable="true"]',
            'textarea',
        ],
        # 전송 버튼
        "send_button": [
            'button[aria-label*="보내기"]',
            'button[aria-label*="Send"]',
            'button:has(mat-icon[fonticon="send"])',
            'button:has-text("전송")',
        ],
        # 파일 첨부 input (숨겨진 <input type=file>)
        "file_input": [
            'input[type="file"]',
        ],
        # 첨부(+) 버튼 — file input이 항상 DOM에 없으면 먼저 이걸 눌러 노출
        "attach_button": [
            'button[aria-label*="추가"]',
            'button[aria-label*="Add"]',
            'button[aria-label*="파일"]',
            'button[aria-label*="upload" i]',
        ],
        # 생성 중 표시(스피너/진행) — 이게 사라지면 생성 완료 신호 중 하나
        "generating_indicator": [
            'text=/생성 중|Generating|만드는 중|처리 중/i',
            '[role="progressbar"]',
            'mat-progress-bar',
            '.loading, .spinner',
        ],
        # 결과물 컨테이너(마지막 응답) — 다운로드/미디어가 여기 안에 렌더됨
        "last_response": [
            'message-content:last-of-type',
            '[data-response-index]:last-of-type',
            'div.model-response:last-of-type',
        ],
        # 다운로드 버튼/메뉴
        "download_button": [
            'button[aria-label*="다운로드"]',
            'button[aria-label*="Download"]',
            'a[download]',
            'button:has-text("다운로드")',
            'button:has(mat-icon[fonticon="download"])',
        ],
        # Extend(연장) 버튼
        "extend_button": [
            'button:has-text("연장")',
            'button:has-text("Extend")',
            'button[aria-label*="연장"]',
            'button[aria-label*="Extend"]',
        ],
        # 생성된 비디오/이미지 엘리먼트(완료 판정 보조)
        "result_media": [
            'video',
            'img[src^="blob:"]',
            'img[src*="googleusercontent"]',
        ],
    }


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout),
              logging.FileHandler("rpa_run.log", encoding="utf-8")],
)
log = logging.getLogger("gemini_rpa")


# ----------------------------------------------------------------------------
# 1. Dolphin 브라우저 연결 (CDP 디버깅 포트) — [요청 산출물 #1]
# ----------------------------------------------------------------------------
def start_dolphin_and_get_cdp() -> str:
    """Dolphin Local API로 프로필을 automation 모드로 켜고 CDP 포트를 얻는다.
    반환: 'http://127.0.0.1:{port}' (Playwright connect_over_cdp 대상)
    """
    if CONFIG.CDP_PORT_OVERRIDE:
        log.info("CDP_PORT override 사용: %s", CONFIG.CDP_PORT_OVERRIDE)
        return f"http://127.0.0.1:{CONFIG.CDP_PORT_OVERRIDE}"

    if not CONFIG.DOLPHIN_PROFILE_ID:
        raise SystemExit("DOLPHIN_PROFILE_ID(환경변수) 또는 CDP_PORT를 설정하세요.")

    # Dolphin Anty Local API: 프로필 automation 시작 → {automation:{port, wsEndpoint}}
    url = (f"{CONFIG.DOLPHIN_API}/v1.0/browser_profiles/"
           f"{CONFIG.DOLPHIN_PROFILE_ID}/start?automation=1")
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    data = r.json()
    port = data["automation"]["port"]
    log.info("Dolphin 프로필 기동, CDP 포트=%s", port)
    return f"http://127.0.0.1:{port}"


async def connect_browser(pw):
    """실행 중인 Dolphin 세션(CDP)에 Playwright를 붙인다. 기존 로그인/쿠키 그대로 사용."""
    cdp = start_dolphin_and_get_cdp()
    browser = await pw.chromium.connect_over_cdp(cdp)
    # 기존 컨텍스트(로그인 세션) 재사용
    context = browser.contexts[0] if browser.contexts else await browser.new_context()
    page = context.pages[0] if context.pages else await context.new_page()
    page.set_default_timeout(CONFIG.UI_TIMEOUT * 1000)
    return browser, context, page


# ----------------------------------------------------------------------------
# 2. 견고한 DOM 제어 — [요청 산출물 #2]
# ----------------------------------------------------------------------------
async def first_locator(page, key: str, timeout: float = None, state="visible"):
    """CONFIG.SELECTORS[key] 후보를 순서대로 시도, 처음으로 보이는 로케이터를 반환.
    클래스명 변경 등에 안 부서지도록 텍스트/역할/구조 기반 후보를 다중화한다.
    """
    timeout = timeout if timeout is not None else CONFIG.UI_TIMEOUT
    deadline = asyncio.get_event_loop().time() + timeout
    last_err = None
    while asyncio.get_event_loop().time() < deadline:
        for sel in CONFIG.SELECTORS[key]:
            loc = page.locator(sel).first
            try:
                if await loc.count() > 0 and (state != "visible" or await loc.is_visible()):
                    return loc
            except Exception as e:  # noqa
                last_err = e
        await asyncio.sleep(0.3)
    raise PWTimeout(f"[{key}] 후보 셀렉터 중 보이는 요소 없음 (last={last_err})")


async def any_visible(page, key: str) -> bool:
    for sel in CONFIG.SELECTORS[key]:
        try:
            if await page.locator(sel).first.is_visible():
                return True
        except Exception:  # noqa
            pass
    return False


# ----------------------------------------------------------------------------
# 3. 동적 대기(Wait) — [요청 산출물 #3]  (고정 sleep 금지)
# ----------------------------------------------------------------------------
async def wait_generation_complete(page, is_video: bool):
    """생성 완료 판정:
       (1) 생성-중 표시가 (잠깐 떴다가) 사라지고,
       (2) 결과 미디어 또는 다운로드 어포던스가 등장할 때까지 폴링.
    """
    total = CONFIG.GEN_TIMEOUT_VIDEO if is_video else CONFIG.GEN_TIMEOUT_IMAGE
    loop = asyncio.get_event_loop()

    # (1) 생성-중 표시가 뜨는지 잠깐 관찰(안 떠도 진행 — 어떤 UI는 즉시 결과)
    appeared_deadline = loop.time() + 15
    while loop.time() < appeared_deadline:
        if await any_visible(page, "generating_indicator"):
            log.info("  생성 시작 감지…")
            break
        await asyncio.sleep(0.5)

    # (2) 완료까지 폴링: 스피너 사라짐 AND (미디어 or 다운로드 버튼) 등장
    deadline = loop.time() + total
    while loop.time() < deadline:
        generating = await any_visible(page, "generating_indicator")
        has_media = await any_visible(page, "result_media")
        has_dl = await any_visible(page, "download_button")
        if (not generating) and (has_media or has_dl):
            log.info("  생성 완료 감지 (media=%s, download=%s)", has_media, has_dl)
            # 미디어가 완전히 로드되도록 네트워크 안정까지 대기(짧게)
            try:
                await page.wait_for_load_state("networkidle", timeout=8000)
            except PWTimeout:
                pass
            return True
        await asyncio.sleep(CONFIG.POLL_INTERVAL)

    raise PWTimeout(f"생성 완료 타임아웃({total}s)")


# ----------------------------------------------------------------------------
# 4. 액션들: 업로드 / 프롬프트 / 다운로드 / 연장
# ----------------------------------------------------------------------------
async def upload_image(page, image_path: str):
    if not image_path:
        return
    p = Path(image_path)
    if not p.exists():
        raise FileNotFoundError(f"참조 이미지 없음: {image_path}")
    # file input이 DOM에 있으면 바로 set, 없으면 첨부 버튼 눌러 노출
    try:
        finp = page.locator(CONFIG.SELECTORS["file_input"][0]).first
        if await finp.count() == 0:
            btn = await first_locator(page, "attach_button")
            await btn.click()
        finp = await first_locator(page, "file_input", state="attached")
        await finp.set_input_files(str(p))
        log.info("  이미지 업로드: %s", p.name)
        # 첨부 썸네일이 붙을 시간(네트워크 기준으로 대기)
        await page.wait_for_load_state("networkidle", timeout=15000)
    except Exception as e:
        raise RuntimeError(f"이미지 업로드 실패: {e}")


async def submit_prompt(page, text: str):
    box = await first_locator(page, "prompt_input")
    await box.click()
    await box.fill("")            # 기존 내용 제거
    await box.type(text, delay=8) # 사람처럼 타이핑
    # 전송: 버튼 우선, 없으면 Enter
    try:
        btn = await first_locator(page, "send_button", timeout=5)
        await btn.click()
    except PWTimeout:
        await box.press("Enter")
    log.info("  프롬프트 전송(%d자)", len(text))


async def download_result(page, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dl_btn = await first_locator(page, "download_button", timeout=CONFIG.UI_TIMEOUT)
    async with page.expect_download(timeout=120000) as di:
        await dl_btn.click()
    download = await di.value
    await download.save_as(str(out_path))
    log.info("  저장: %s", out_path.name)
    return out_path


async def do_extends(page, n: int, out_dir: Path, base: str, is_video: bool):
    paths = []
    for i in range(1, n + 1):
        log.info("  연장 %d/%d", i, n)
        btn = await first_locator(page, "extend_button", timeout=CONFIG.UI_TIMEOUT)
        await btn.click()
        await wait_generation_complete(page, is_video)
        paths.append(await download_result(page, out_dir / f"{base}_ext{i}.mp4"))
    return paths


# ----------------------------------------------------------------------------
# 5. 씬/작업 실행 (체크포인트 + 재시도)
# ----------------------------------------------------------------------------
@dataclass
class Scene:
    n: int
    tool: str            # "veo3" | "nanobanana"
    prompt: str
    ref_image: str = ""
    extend: int = 0
    caption: str = ""    # assemble.py에서 자막으로 사용


async def run_scene(page, scene: Scene, out_dir: Path):
    is_video = scene.tool.lower().startswith("veo")
    ext = "mp4" if is_video else "png"
    out_path = out_dir / f"scene_{scene.n:02d}.{ext}"

    if out_path.exists():                       # 체크포인트: 이미 받은 씬은 스킵
        log.info("씬 %02d 이미 존재 → 스킵", scene.n)
        return [out_path]

    last_exc = None
    for attempt in range(1, CONFIG.RETRIES + 2):
        try:
            log.info("씬 %02d [%s] 시도 %d", scene.n, scene.tool, attempt)
            await upload_image(page, scene.ref_image)
            await submit_prompt(page, scene.prompt)
            await wait_generation_complete(page, is_video)
            results = [await download_result(page, out_path)]
            if is_video and scene.extend > 0:
                results += await do_extends(page, scene.extend, out_dir,
                                            f"scene_{scene.n:02d}", is_video)
            await asyncio.sleep(CONFIG.THROTTLE)   # 계정 보호 간격
            return results
        except Exception as e:                     # noqa
            last_exc = e
            log.warning("씬 %02d 실패(%s): %s", scene.n, attempt, e)
            shot = out_dir / f"_error_scene{scene.n:02d}_try{attempt}.png"
            try:
                await page.screenshot(path=str(shot))
            except Exception:  # noqa
                pass
            await asyncio.sleep(CONFIG.THROTTLE)
    raise RuntimeError(f"씬 {scene.n} 최종 실패: {last_exc}")


async def run_job(page, job: dict):
    out_dir = Path(job["output_dir"]) / job["video_id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    scenes = [Scene(**{k: s.get(k, "") if k not in ("n", "extend") else s.get(k, 0)
                       for k in ("n", "tool", "prompt", "ref_image", "extend", "caption")})
              for s in job["scenes"]]

    manifest = {"video_id": job["video_id"], "title": job.get("title_ko", ""),
                "scenes": [], "clips": []}
    for sc in scenes:
        clips = await run_scene(page, sc, out_dir)
        manifest["scenes"].append({"n": sc.n, "caption": sc.caption,
                                   "files": [c.name for c in clips]})
        manifest["clips"] += [str(c) for c in clips]

    # 자막/BGM 정보를 매니페스트에 실어 assemble.py로 넘김
    manifest["captions"] = [{"n": sc.n, "text": sc.caption} for sc in scenes]
    manifest["bgm"] = job.get("bgm", "")
    manifest["title_ko"] = job.get("title_ko", "")
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("작업 완료: %s (%d 씬) → manifest.json 저장", job["video_id"], len(scenes))
    return out_dir / "manifest.json"


# ----------------------------------------------------------------------------
# 6. 엔트리포인트
# ----------------------------------------------------------------------------
async def main(job_paths):
    async with async_playwright() as pw:
        browser, context, page = await connect_browser(pw)
        try:
            if "gemini.google.com" not in (page.url or ""):
                await page.goto(CONFIG.GEMINI_URL, timeout=CONFIG.NAV_TIMEOUT * 1000)
            for jp in job_paths:
                job = json.loads(Path(jp).read_text(encoding="utf-8"))
                await run_job(page, job)
        finally:
            # Dolphin 세션은 유지(닫지 않음). 연결만 해제.
            await browser.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python gemini_rpa.py jobs/sample_video_yura_wealth.json [job2.json ...]")
        sys.exit(1)
    asyncio.run(main(sys.argv[1:]))
