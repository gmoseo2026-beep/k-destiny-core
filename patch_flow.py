import re

with open("automation/flow_rpa.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add VIDEO_SECTION and IMAGE_SECTION to CONFIG
if "VIDEO_SECTION =" not in code:
    cfg_add = '''
    VIDEO_SECTION = 'text=/Video generation default|동영상 생성 기본값/i >> xpath=..'
    IMAGE_SECTION = 'text=/Image generation default|이미지 생성 기본값/i >> xpath=..'
'''
    code = code.replace("    SELECTORS = {", cfg_add + "\n    SELECTORS = {")

# 2. Add selectors to CONFIG.SELECTORS
sel_add = '''
        "settings_open": ['button:has-text("tune")'],
        "confirm_auto":  ['button[role="radio"][value="AUTO_APPROVE"]'],
        "profile_open":  ['button:has(img[alt="User profile image"])'],
        "credit_text":   ['a:has-text("Google Flow credits")'],
'''
if '"settings_open"' not in code:
    code = code.replace('        "file_input": [\'input[type="file"]\'],', '        "file_input": [\'input[type="file"]\'],\n' + sel_add)

# 3. Add Agree dismiss to connect_browser
agree_code = '''
    # 팝업(동의) 제거
    try:
        agree_btn = page.locator('button:has-text("Agree")').first
        if await agree_btn.is_visible(timeout=1000):
            await agree_btn.click()
            await asyncio.sleep(1.0)
    except Exception:
        pass
'''
if "Agree" not in code:
    code = code.replace("    return browser, context, page", agree_code + "\n    return browser, context, page")

# 4. Add I agree dismiss to run_job (after set_input_files)
i_agree_code = '''
                await page.locator(CONFIG.SELECTORS["file_input"][0]).first.set_input_files(scene.ref_image)
                await asyncio.sleep(1.5)
                # 업로드 동의 모달 닫기
                try:
                    i_agree = page.locator('button:has-text("I agree")').first
                    if await i_agree.count() > 0 and await i_agree.is_visible():
                        await i_agree.click()
                        await asyncio.sleep(1.0)
                except Exception:
                    pass
'''
if "I agree" not in code:
    code = code.replace("                await page.locator(CONFIG.SELECTORS[\"file_input\"][0]).first.set_input_files(scene.ref_image)\n                await asyncio.sleep(1.5)", i_agree_code)


# 5. Add ensure_ functions
ensure_funcs = '''
def _norm(s: str) -> str:
    return re.sub(r"[\\s\\-\\.\[\\]_]", "", (s or "").lower())

async def read_selected_model(page) -> str:
    sec = page.locator(CONFIG.VIDEO_SECTION)
    btn = sec.locator('button[aria-haspopup="menu"]').last
    if await btn.count() > 0:
        return (await btn.inner_text()).strip().split("\\n")[0].strip()
    return ""

async def ensure_model(page):
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
                try: await page.keyboard.press("Escape")
                except: pass
        actual = await read_selected_model(page)
        if not actual:
            raise RuntimeError("모델 확정 실패: 선택된 모델을 읽지 못함")
        if _norm(CONFIG.MODEL_LABEL) != _norm(actual):
            raise RuntimeError(f"모델 확정 실패: 기대='{CONFIG.MODEL_LABEL}' 실제='{actual}'")
        for bad in CONFIG.MODEL_FORBIDDEN:
            if _norm(bad) in _norm(actual):
                raise RuntimeError(f"금지 모델 선택됨('{actual}')")
        log.info("모델 설정 완료: %s", actual)
    except Exception as e:
        raise RuntimeError(f"모델 확정 실패: {e}")

async def ensure_outputs_per_prompt(page, n=1):
    try:
        v_sec = page.locator(CONFIG.VIDEO_SECTION)
        v_tab = v_sec.get_by_role("tab", name=f"{n}x" if n == 1 else f"x{n}", exact=True)
        if await v_tab.count() > 0 and await v_tab.get_attribute("data-state") != "active":
            await v_tab.click()
            await asyncio.sleep(0.4)
        v_st = await v_tab.get_attribute("data-state") if await v_tab.count() > 0 else "unknown"
        if v_st != "active":
            raise RuntimeError(f"Video 출력 개수 강제 실패")
            
        i_sec = page.locator(CONFIG.IMAGE_SECTION)
        i_tab = i_sec.get_by_role("tab", name="1x", exact=True)
        if await i_tab.count() > 0 and await i_tab.get_attribute("data-state") != "active":
            await i_tab.click()
            await asyncio.sleep(0.4)
        log.info("출력 개수 강제 설정 완료 (Video %dx, Image 1x)", n)
    except Exception as e:
        raise RuntimeError(f"출력 개수 설정 실패: {e}")

async def ensure_auto_approve(page):
    el = await first_locator(page, "confirm_auto", timeout=5000)
    if not el:
        raise RuntimeError("Confirm-before-generating 설정을 찾지 못함")
    if await el.get_attribute("aria-checked") != "true":
        await el.click(); await asyncio.sleep(0.5)
    if await el.get_attribute("aria-checked") != "true":
        raise RuntimeError("자동 승인 설정 실패")
    log.info("자동 승인(Never) 확인됨")

async def ensure_flow_settings(page):
    is_open = False
    try:
        await first_locator(page, "confirm_auto", timeout=2000)
        is_open = True
    except Exception:
        pass
    if not is_open:
        btn = await first_locator(page, "settings_open", timeout=30_000)
        await btn.click()
        try:
            await first_locator(page, "confirm_auto", timeout=5000)
        except Exception:
            raise RuntimeError("Agent settings 렌더링 실패")
    try:
        await ensure_auto_approve(page)
        await ensure_model(page)
        await ensure_outputs_per_prompt(page, 1)
    finally:
        try:
            close_btn = page.locator('button:has-text("close")').first
            if await close_btn.count() > 0 and await close_btn.is_visible():
                await close_btn.click()
                await asyncio.sleep(0.6)
        except Exception:
            pass
        try:
            if await page.locator(CONFIG.SELECTORS["confirm_auto"][0]).count() > 0:
                await page.keyboard.press("Escape")
                await asyncio.sleep(0.6)
        except Exception:
            pass
'''
if "def ensure_flow_settings" not in code:
    code = code.replace("async def run_job(page, job, out_dir=None, state=None):", ensure_funcs + "\n\nasync def run_job(page, job, out_dir=None, state=None):")

with open("automation/flow_rpa.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Patch applied to flow_rpa.py successfully.")
