import asyncio
from playwright.async_api import async_playwright

async def dump_dom():
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
            context = browser.contexts[0]
            flow_page = None
            for p in context.pages:
                if "labs.google" in p.url:
                    flow_page = p
                    break
            
            if not flow_page:
                print("Flow page not found among open tabs.")
                for p in context.pages:
                    print("Tab:", p.url)
                await browser.close()
                return

            print("Found Flow page:", flow_page.url)
            
            # Click settings if possible
            try:
                await flow_page.locator('button[aria-label="Settings"], button:has-text("설정"), button:has-text("Settings")').first.click(timeout=3000)
                await asyncio.sleep(2)
            except Exception as e:
                print("Could not click settings:", e)
                
            html = await flow_page.content()
            with open("C:\\Users\\gmose\\OneDrive\\바탕 화면\\k-destiny\\flow_dom.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("DOM saved to flow_dom.html")
            await browser.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(dump_dom())
