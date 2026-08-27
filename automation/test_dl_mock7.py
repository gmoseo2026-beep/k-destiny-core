import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def test_dl():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        client = await context.new_cdp_session(page)
        await client.send('Page.setDownloadBehavior', {
            'behavior': 'allow',
            'downloadPath': 'C:/kd/out/downloads/'
        })
        
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
            await dl_menu.click()
            print("Clicked!")
            
        await browser.close()
asyncio.run(test_dl())
