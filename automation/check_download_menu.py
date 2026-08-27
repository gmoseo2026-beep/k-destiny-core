import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        print("Finding result tile...")
        # Get the first result tile
        tile = page.locator('video, img[src^="blob:"]').first
        if await tile.count() > 0 and await tile.is_visible():
            print("Found tile. Hovering...")
            await tile.hover()
            await asyncio.sleep(1)
            
            # Find the more button
            more = page.locator('button:has-text("more_vert"), button:has-text("More options"), button[aria-haspopup="menu"]').first
            if await more.count() > 0 and await more.is_visible():
                print("Clicking more button...")
                await more.click()
                await asyncio.sleep(1)
                
                await page.screenshot(path='C:/kd/out/flow_tile_menu.png')
                print("Screenshot saved to C:/kd/out/flow_tile_menu.png")
                
                # Print all menuitems
                menus = await page.locator('[role="menuitem"]').all()
                for i, m in enumerate(menus):
                    if await m.is_visible():
                        text = await m.evaluate('e => e.innerText')
                        print(f"MenuItem {i}: text='{text}'")
                
                # Print all divs in the menu
                print("Checking elements with text Download...")
                dls = await page.locator(':has-text("Download")').all()
                for dl in dls:
                    if await dl.is_visible():
                        tag = await dl.evaluate('e => e.tagName')
                        print(f"Found Download text in tag {tag}")
            else:
                print("More button not found.")
        else:
            print("No result tile found.")
            
        await browser.close()

asyncio.run(check())
