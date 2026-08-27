import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

async def test_cdp_dl():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        client = await browser.contexts[0].new_cdp_session(page)
        
        dl_dir = Path("C:/kd/out/downloads")
        dl_dir.mkdir(parents=True, exist_ok=True)
        
        await client.send('Browser.setDownloadBehavior', {
            'behavior': 'allow',
            'downloadPath': str(dl_dir),
            'eventsEnabled': True
        })
        
        print("Set download behavior!")
        
        tile_with_btn = page.locator('div:has(video):has(button[aria-haspopup="menu"])').last
        await tile_with_btn.hover()
        await asyncio.sleep(0.5)
        
        more_btn = tile_with_btn.locator('button[aria-haspopup="menu"]').last
        await more_btn.click(force=True)
        await asyncio.sleep(0.5)
        
        dl_menu = page.locator('[role="menuitem"]:has-text("Download"), div:has-text("Download")').first
        await dl_menu.hover()
        await asyncio.sleep(0.5)
        
        print("Clicking download...")
        await dl_menu.click(force=True)
        
        await asyncio.sleep(10)
        
        import os
        files = os.listdir(str(dl_dir))
        print(f"Files in dl_dir: {files}")
        
        await browser.close()
asyncio.run(test_cdp_dl())
