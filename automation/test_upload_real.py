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
        
        # 2. Click the first image in the list
        print("Clicking first image...")
        modal = page.locator('div[role="dialog"]').first
        # In the screenshot, the list items have images.
        first_img = modal.locator('img').first
        await first_img.click(force=True)
        print("Clicked first image.")
        await asyncio.sleep(2)
        
        # 3. Find Add to Prompt and wait for it to be enabled
        print("Waiting for Add to Prompt to be enabled...")
        atp = modal.locator('button:has-text("Add to Prompt")').first
        
        # wait until the button is not disabled
        for i in range(10):
            is_disabled = await atp.get_attribute("disabled")
            if is_disabled is None:
                print("Button is ENABLED!")
                await atp.click(force=True)
                print("Clicked Add to Prompt.")
                break
            await asyncio.sleep(1)
        else:
            print("Button never became enabled.")
            
        await asyncio.sleep(2)
        
        # verify if image is in prompt box by checking for img tag or chip
        prompt_box = page.locator('div[contenteditable="true"][role="textbox"]').first
        if await prompt_box.count() > 0:
            html = await prompt_box.evaluate('e => e.innerHTML')
            print(f"Prompt box HTML after attach:\n{html[:200]}")
            
        await page.screenshot(path='C:/kd/out/flow_after_add_real.png')
        print("Screenshot saved to C:/kd/out/flow_after_add_real.png")
            
        await browser.close()

asyncio.run(test_upload())
