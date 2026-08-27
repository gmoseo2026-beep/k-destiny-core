import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        tiles = page.locator('[data-tile-id]')
        if await tiles.count() > 0:
            tile = tiles.first
            await tile.hover()
            await asyncio.sleep(1.0)
            
            # Find all buttons with popup
            btns = page.locator('button[aria-haspopup="menu"]')
            count = await btns.count()
            print(f"Found {count} buttons with aria-haspopup='menu'")
            for i in range(count):
                b = btns.nth(i)
                html = await b.evaluate("el => el.outerHTML")
                print(f"Button {i}: {html[:150]}")
                
            # Find buttons inside tile
            btns_in = tile.locator('button[aria-haspopup="menu"]')
            count_in = await btns_in.count()
            print(f"Found {count_in} buttons INSIDE tile")
            
            # Find any button with "more" in label
            more_btns = page.locator('button[aria-label*="more" i], button[aria-label*="옵션" i], button[aria-label*="더보기" i]')
            count_m = await more_btns.count()
            print(f"Found {count_m} buttons with 'more' in aria-label")
            for i in range(count_m):
                b = more_btns.nth(i)
                html = await b.evaluate("el => el.outerHTML")
                print(f"More Button {i}: {html[:150]}")
                
        await browser.close()

asyncio.run(test())
