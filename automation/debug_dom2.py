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
            
            # Find buttons inside tile
            btns_in = tile.locator('button[aria-haspopup="menu"]')
            if await btns_in.count() > 0:
                b = btns_in.first
                vis = await b.is_visible()
                print(f"More btn inside tile visible? {vis}")
                
                # force click
                print("Force clicking...")
                await b.click(force=True)
                await asyncio.sleep(1.0)
                
                # check if Download menuitem exists
                dl = page.locator('[role="menuitem"]:has-text("Download")')
                dl_count = await dl.count()
                print(f"Download menu items found: {dl_count}")
                if dl_count > 0:
                    vis2 = await dl.first.is_visible()
                    print(f"Download menu item visible? {vis2}")
                else:
                    html = await page.evaluate("document.body.innerHTML")
                    with open("debug_dom_fail.html", "w", encoding="utf-8") as f:
                        f.write(html)
                        
        await browser.close()

asyncio.run(test())
