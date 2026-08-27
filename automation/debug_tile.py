import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        tiles = page.locator('[data-tile-id]')
        if await tiles.count() > 0:
            html = await tiles.first.evaluate("el => el.outerHTML")
            with open("debug_generating_tile.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("Saved debug_generating_tile.html")
                        
        await browser.close()

asyncio.run(test())
