import asyncio, sys, io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def test_dl():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        # Override showSaveFilePicker to undefined
        await page.evaluate('''
            window.showSaveFilePicker = undefined;
            return true;
        ''')
        
        # Find a tile and click download
        tiles = await page.locator('[data-tile-id]').all()
        if len(tiles) > 0:
            t = tiles[0]
            await t.hover()
            await asyncio.sleep(0.5)
            
            more_btn = t.locator('button[aria-haspopup="menu"]').last
            await more_btn.click()
            await asyncio.sleep(0.5)
            
            dl_menu = page.locator('[role="menuitem"]:has-text("Download"), div:has-text("Download")').first
            await dl_menu.hover()
            await asyncio.sleep(0.5)
            
            print("Clicking download...")
            async with page.expect_download(timeout=15000) as di:
                await dl_menu.click()
                
            d = await di.value
            out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            await d.save_as(str(out_path))
            print(f"Downloaded to {out_path}!")
        else:
            print("No tiles found")
            
        await browser.close()
asyncio.run(test_dl())
