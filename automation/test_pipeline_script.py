import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright
import time

async def test_generation():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        ctx = browser.contexts[0]
        page = ctx.pages[0]
        image_path = "C:/kd/dummy.jpg"
        print(f"Using image path: {image_path}")
        add_btn = page.locator('button:has(i:has-text("add_2")), button[aria-label*="image" i]').first
        if await add_btn.count() > 0 and await add_btn.is_visible():
            await add_btn.click(force=True)
            await asyncio.sleep(1)
        else:
            print("Attach button not found.")
            
        print("Setting input files...")
        finp = page.locator('input[type="file"]').first
        await finp.set_input_files(image_path)
        await asyncio.sleep(3)

        print("Clicking Add to Prompt...")
        clicked_add = False
        atp = page.locator('button:has-text("Add to Prompt")').first
        if await atp.count() > 0 and await atp.is_visible():
            await atp.click(force=True)
            await asyncio.sleep(2)
            print("Clicked Add to Prompt.")
            clicked_add = True
        else:
            print("Add to Prompt NOT found or NOT visible.")

        # Close any dialog
        try:
            popup = page.locator('div[role="dialog"]').filter(has_text="Upload media").first
            if await popup.count() > 0 and await popup.is_visible():
                print("Closing popup with Escape...")
                await page.keyboard.press("Escape")
                await asyncio.sleep(1)
        except:
            pass

        # 2. submit_prompt_and_generate
        print("Entering prompt...")
        box = page.locator('div[contenteditable="true"][role="textbox"]').first
        if await box.count() > 0 and await box.is_visible():
            await box.focus()
            await asyncio.sleep(0.5)
            await page.keyboard.type("Test generation with python script", delay=10)
            await asyncio.sleep(1)
            
            text = await box.evaluate("e => e.innerText")
            print(f"Prompt text is: {text}")
        else:
            print("Prompt box not visible.")

        print("Clicking Create button...")
        btn = page.locator('button:has-text("Create"):has(i:has-text("arrow_forward"))').first
        if await btn.count() > 0 and await btn.is_visible():
            await btn.click()
            print("Create button clicked.")
        else:
            print("Create button not visible.")

        # Wait a bit to see if generation indicator appears
        print("Waiting for generating indicator...")
        await asyncio.sleep(3)
        gen_ind = page.locator('div[role="progressbar"], progress').first
        if await gen_ind.count() > 0 and await gen_ind.is_visible():
            print("Generating indicator found! Generation started.")
        else:
            print("Generating indicator NOT found.")
            
        await page.screenshot(path='C:/kd/out/flow_after_create_test.png')
        print("Screenshot saved to C:/kd/out/flow_after_create_test.png")

        await browser.close()

asyncio.run(test_generation())
