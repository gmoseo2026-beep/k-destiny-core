import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def debug_flow():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        ctx = browser.contexts[0]
        page = ctx.pages[0]
        print(f"URL: {page.url}")
        
        # 1. Check prompt input
        box = page.locator('div[contenteditable="true"][role="textbox"]').first
        if await box.count() > 0 and await box.is_visible():
            print("Prompt input found.")
            # Type something test
            await box.focus()
            await page.keyboard.type("Test prompt input", delay=10)
            text = await box.evaluate("e => e.innerText")
            print(f"Text in box after type: {text}")
        else:
            print("Prompt input NOT found or NOT visible.")
            
        # 2. Check attach button
        add_btn = page.locator('button:has(i:has-text("add_2")), button[aria-label*="image" i]').first
        if await add_btn.count() > 0 and await add_btn.is_visible():
            print("Add/Attach button found.")
            await add_btn.click(force=True)
            await asyncio.sleep(1)
            # Find the file input in the popup
            file_input = page.locator('input[type="file"]').first
            if await file_input.count() > 0:
                print("File input found.")
                # We won't actually upload a real image here just to check DOM, but let's see if Add to Prompt is visible
                add_to_prompt = page.locator('button:has-text("Add to Prompt")').first
                if await add_to_prompt.count() > 0:
                    vis = await add_to_prompt.is_visible()
                    print(f"Add to Prompt button found, visible: {vis}")
                else:
                    print("Add to Prompt button NOT found.")
                
                # Close the popup (usually Escape works)
                await page.keyboard.press("Escape")
                await asyncio.sleep(1)
            else:
                print("File input NOT found in popup.")
        else:
            print("Add/Attach button NOT found.")
            
        # 3. Check generate button
        btn = page.locator('button:has-text("Create"):has(i:has-text("arrow_forward"))').first
        if await btn.count() > 0 and await btn.is_visible():
            print("Create button found.")
            is_disabled = await btn.get_attribute("disabled")
            print(f"Create button disabled attribute: {is_disabled}")
        else:
            print("Create button NOT found or NOT visible.")

        await browser.close()

asyncio.run(debug_flow())
