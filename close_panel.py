import asyncio
from playwright.async_api import async_playwright

async def close_panel():
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
            context = browser.contexts[0]
            flow_page = None
            for p in context.pages:
                if "labs.google" in p.url:
                    flow_page = p
                    break
            
            # Click close button if there
            try:
                await flow_page.locator('button:has-text("close")').first.click(timeout=1000)
                await asyncio.sleep(1)
            except: pass
            
            is_vis = await flow_page.locator('div[role="textbox"]').first.is_visible()
            print("Textbox visible after close?", is_vis)
            
            await browser.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(close_panel())
