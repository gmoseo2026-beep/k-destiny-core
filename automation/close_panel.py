import asyncio
from playwright.async_api import async_playwright

async def close_panel():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        # Try tune toggle
        tune = page.locator('button:has-text("tune")').first
        if await tune.count() > 0 and await tune.is_visible():
            await tune.click()
            await asyncio.sleep(1)
            print("Clicked tune")
        
        # Check if panel closed
        ca = page.locator('button[role="radio"][value="AUTO_APPROVE"]').first
        if await ca.count() > 0 and await ca.is_visible():
            print("Panel still open, trying Back")
            back = page.locator('button:has-text("Back")').first
            if await back.count() > 0:
                await back.click()
                await asyncio.sleep(1)
                print("Clicked Back")
        
        # Final check
        tb = page.locator('div[role="textbox"]').first
        print(f"Textbox visible: {await tb.is_visible()}")
        await browser.close()

asyncio.run(close_panel())
