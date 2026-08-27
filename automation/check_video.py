import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check_vid():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        tiles = await page.locator('[data-tile-id]').all()
        for i, t in enumerate(tiles):
            vid = t.locator('video')
            if await vid.count() > 0:
                src = await vid.first.get_attribute('src')
                print(f"Tile {i} video src: {src[:100] if src else 'None'}")
                
        await browser.close()

asyncio.run(check_vid())
