import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def test_upload():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        # 1. Open the popup by clicking bottom + button
        print("Clicking bottom + button...")
        btns = await page.locator('button:has(i:has-text("add"))').all()
        for b in btns:
            if await b.is_visible():
                bb = await b.bounding_box()
                if bb and bb['y'] > 700:
                    await b.click(force=True)
                    print(f"Clicked bottom + button at {bb['y']:.0f}")
                    break
        await asyncio.sleep(2)
        
        # 2. Open file chooser by clicking Upload media
        print("Clicking Upload media...")
        async with page.expect_file_chooser() as fc_info:
            await page.locator('button:has-text("Upload media")').first.click()
        file_chooser = await fc_info.value
        await file_chooser.set_files("C:/kd/dummy.jpg")
        print("File selected in chooser.")
        await asyncio.sleep(4)
        
        # 3. Find Add to Prompt
        print("Clicking Add to Prompt...")
        atp = page.locator('button:has-text("Add to Prompt")').first
        if await atp.count() > 0 and await atp.is_visible():
            await atp.click(force=True)
            print("Clicked Add to Prompt.")
        else:
            print("Add to prompt button not found.")
            
        await asyncio.sleep(2)
        await page.screenshot(path='C:/kd/out/flow_after_add.png')
        print("Screenshot saved to C:/kd/out/flow_after_add.png")
            
        await browser.close()

asyncio.run(test_upload())
