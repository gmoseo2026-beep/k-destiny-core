import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        print("URL:", page.url)
        
        # All visible buttons
        buttons = await page.locator("button").all()
        for b in buttons:
            if await b.is_visible():
                try:
                    txt = (await b.inner_text()).replace("\n", "\\n")[:50]
                    print(f"  btn: {txt}")
                except: pass
        
        # Textbox
        tb = page.locator('div[role="textbox"]').first
        print(f"\nTextbox count={await tb.count()}, visible={await tb.is_visible() if await tb.count() > 0 else 'N/A'}")
        
        # Textarea
        ta = page.locator('textarea').first
        print(f"Textarea count={await ta.count()}")
        
        await browser.close()

asyncio.run(check())
