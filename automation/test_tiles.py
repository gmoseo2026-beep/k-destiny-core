import asyncio
from playwright.async_api import async_playwright

async def test_dl():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        tiles = await page.locator('[data-tile-id]').all()
        print(f"Found {len(tiles)} tiles with data-tile-id")
        for i, t in enumerate(tiles):
            vid = await t.locator('video').count()
            img = await t.locator('img[src^="blob:"]').count()
            print(f"Tile {i}: videos={vid}, blob_imgs={img}")
            
            # Hover and check menus
            await t.hover()
            await asyncio.sleep(0.5)
            more = t.locator('button:has-text("more_vert"), button[aria-label="More options"]')
            if await more.count() > 0:
                print(f"  Tile {i} has {await more.count()} more buttons")
            else:
                print(f"  Tile {i} has NO more buttons")
                
        await browser.close()

asyncio.run(test_dl())
