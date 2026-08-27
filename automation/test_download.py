import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def test_dl():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        # Override showSaveFilePicker
        await page.evaluate('''() => {
            window.showSaveFilePicker = async (opts) => {
                console.log("showSaveFilePicker called!", opts);
                throw new Error("AbortError"); // Force fallback to <a download>
            };
        }''')
        
        tiles = await page.locator('[data-tile-id]').all()
        target_tile = None
        for t in tiles:
            if await t.locator('video').count() > 0:
                target_tile = t
                break
        
        if target_tile:
            print("Hovering video tile...")
            await target_tile.hover()
            await asyncio.sleep(1)
            
            more_btn = target_tile.locator('button:has-text("more_vert"), button[aria-label="More options"], button[aria-haspopup="menu"]').first
            if await more_btn.count() > 0 and await more_btn.is_visible():
                print("Clicking more button...")
                await more_btn.click()
                await asyncio.sleep(1)
                
                dl = page.locator('[role="menuitem"]:has-text("Download")').first
                if await dl.count() > 0 and await dl.is_visible():
                    print("Clicking Download...")
                    try:
                        async with page.expect_download(timeout=10000) as di:
                            await dl.click(force=True)
                        d = await di.value
                        print(f"Download started: {d.suggested_filename}")
                        await d.save_as('C:/kd/out/' + d.suggested_filename)
                        print("Download saved.")
                    except Exception as e:
                        print(f"Download failed: {e}")
                else:
                    print("Download button not found in menu.")
            else:
                print("More button not found in tile.")
        else:
            print(f"No video tile found.")
            
        await browser.close()

asyncio.run(test_dl())
