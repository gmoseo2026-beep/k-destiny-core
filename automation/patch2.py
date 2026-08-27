import sys

with open('automation/flow_rpa.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update LOCATORS
target_loc = """        "result_tile": [
            '[data-result-id]',
            'video',
            'img[src^="blob:"]'
        ],
        # 다운로드 (결과 타일 내)"""
replacement_loc = """        "result_tile": [
            '[data-tile-id]',
            'video',
            'img[src^="blob:"]'
        ],
        "tile_menu": [
            'button[aria-haspopup="menu"]'
        ],
        # 다운로드 (결과 타일 내)"""
code = code.replace(target_loc, replacement_loc)

# 2. Update download_result
target_dl = """async def download_result(result_locator, out_path: Path):
    \"\"\"새 결과 타일 내부의 다운로드 버튼만 클릭한다. 전역 검색 금지 (D2).\"\"\"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 타일 위로 호버하여 다운로드 버튼 등 UI 요소를 표시
    await result_locator.hover()
    await asyncio.sleep(0.5)
    
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
    await d.save_as(str(out_path))"""

replacement_dl = """async def download_result(result_locator, out_path: Path):
    \"\"\"새 결과 타일에서 More 메뉴를 열고 다운로드 서브메뉴에서 화질을 선택한다.\"\"\"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 1. 타일 위로 호버하여 More 버튼을 표시
    await result_locator.hover()
    await asyncio.sleep(0.5)
    
    # 2. More 버튼 찾기 및 클릭
    more_btn = await first_locator(result_locator, "tile_menu", timeout=CONFIG.UI_TIMEOUT)
    await more_btn.click()
    await asyncio.sleep(0.5)
    
    page = result_locator.page
    
    # 3. Download 메뉴 호버
    dl_menu = page.locator('[role="menuitem"]:has-text("Download")').first
    await dl_menu.hover()
    await asyncio.sleep(0.5)
    
    # 4. 화질 선택 (1080p 권장)
    async with page.expect_download(timeout=180_000) as di:
        q_opt = page.locator('[role="menuitem"]:has-text("1080p")').first
        if await q_opt.count() > 0 and await q_opt.is_visible():
            await q_opt.click()
        else:
            # 1080p가 없으면 아무 화질이나(4K 제외) 클릭
            q_opt_alt = page.locator('[role="menuitem"]:has-text("720p")').first
            if await q_opt_alt.count() > 0:
                await q_opt_alt.click()
            else:
                await dl_menu.click() # Fallback

    d = await di.value
    await d.save_as(str(out_path))"""

if target_dl in code:
    code = code.replace(target_dl, replacement_dl)
    with open('automation/flow_rpa.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Patched successfully!")
else:
    print("Download result target not found!")
