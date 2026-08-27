import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        # Get the first result tile
        tile = page.locator('video, img[src^="blob:"]').first
        if await tile.count() > 0:
            # We need to hover the parent tile container, not just the video element.
            # Usually the container is the one with data-tile-id or the closest li/div
            # Actually, let's just use bounding_box and click the top-right corner of the tile
            bb = await tile.bounding_box()
            if bb:
                print("Hovering tile...")
                await page.mouse.move(bb['x'] + bb['width']/2, bb['y'] + bb['height']/2)
                await asyncio.sleep(1)
                
                # The more button should appear. It's usually a button with more_vert icon
                # Let's search inside the bounding box, or just globally since we hovered
                more_btn = page.locator('button:has-text("more_vert"), button[aria-label="More options"]').all()
                for m in await more_btn:
                    if await m.is_visible():
                        mb_bb = await m.bounding_box()
                        # check if it's inside or near the tile
                        if mb_bb and mb_bb['x'] >= bb['x'] and mb_bb['x'] <= bb['x'] + bb['width']:
                            print("Found tile more button. Clicking...")
                            await m.click()
                            await asyncio.sleep(1)
                            break
                            
                await page.screenshot(path='C:/kd/out/flow_tile_menu2.png')
                print("Screenshot saved to C:/kd/out/flow_tile_menu2.png")
                
                # Print all menuitems
                menus = await page.locator('[role="menuitem"]').all()
                for i, m in enumerate(menus):
                    if await m.is_visible():
                        text = await m.evaluate('e => e.innerText')
                        print(f"MenuItem {i}: text='{text}'")
                        
                # Check for Download text
                dls = await page.locator(':has-text("Download")').all()
                for dl in dls:
                    if await dl.is_visible():
                        tag = await dl.evaluate('e => e.tagName')
                        text = await dl.evaluate('e => e.innerText')
                        print(f"Found Download text in tag {tag}: '{text}'")
                        
        await browser.close()

asyncio.run(check())
