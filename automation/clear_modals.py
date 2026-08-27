import asyncio
from playwright.async_api import async_playwright

async def clear():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        # Click I agree / Agree / No thanks
        for txt in ["I agree", "Agree", "No thanks"]:
            try:
                btn = page.locator(f'button:has-text("{txt}")').first
                if await btn.count() > 0 and await btn.is_visible():
                    await btn.click()
                    await asyncio.sleep(1)
                    print(f"Clicked: {txt}")
            except: pass
        
        # Escape overlay
        for _ in range(3):
            try:
                ov = page.locator('div[data-state="open"][aria-hidden="true"]').first
                if await ov.count() > 0 and await ov.is_visible():
                    await page.keyboard.press("Escape")
                    await asyncio.sleep(0.5)
                    print("Pressed Escape for overlay")
                else:
                    break
            except: break
        
        # Check if textbox is now clickable
        tb = page.locator('div[role="textbox"]').first
        print(f"Textbox visible: {await tb.is_visible()}")
        await browser.close()

asyncio.run(clear())
