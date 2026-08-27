import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        ss = r"c:\Users\gmose\OneDrive\바탕 화면\k-destiny\automation\debug_gen_status.png"
        await page.screenshot(path=ss, full_page=False)
        print(f"Screenshot: {ss}")
        
        await browser.close()

asyncio.run(check())
