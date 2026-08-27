import asyncio
from playwright.async_api import async_playwright

async def check_prompt():
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
            context = browser.contexts[0]
            flow_page = None
            for p in context.pages:
                if "labs.google" in p.url:
                    flow_page = p
                    break
            if not flow_page: return
            
            # Close panel if open
            try:
                await flow_page.locator('button:has-text("close")').first.click(timeout=1000)
            except: pass

            locs = await flow_page.locator('div[role="textbox"]').all()
            print("Found textboxes:", len(locs))
            for i, loc in enumerate(locs):
                try:
                    is_vis = await loc.is_visible()
                    html = await loc.evaluate("el => el.outerHTML")
                    print(f"[{i}] visible={is_vis} html={html[:100]}")
                except: pass
                
            await browser.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(check_prompt())
