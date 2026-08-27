import asyncio
from playwright.async_api import async_playwright

PROJECT_URL = "https://labs.google/fx/tools/flow/project/8f8c4126-99bb-4477-9e21-9494dbc9673e"

async def fix():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        print("Current URL:", page.url)
        if "project" not in page.url:
            print("Navigating back to project...")
            await page.goto(PROJECT_URL, timeout=30000)
            await asyncio.sleep(3)
            print("New URL:", page.url)
        
        # Check textbox now
        tb = page.locator('div[role="textbox"]').first
        print(f"Textbox visible: {await tb.is_visible() if await tb.count() > 0 else 'not found'}")
        
        await browser.close()

asyncio.run(fix())
