import asyncio
from playwright.async_api import async_playwright

async def dump_buttons():
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
                return

            print("Found Flow page:", flow_page.url)
            
            # Click settings
            try:
                await flow_page.locator('button[aria-label="Settings"], button:has-text("설정"), button:has-text("Settings")').first.click(timeout=3000)
                await asyncio.sleep(2)
            except Exception as e:
                pass
                
            buttons = await flow_page.locator("button").all()
            for i, b in enumerate(buttons):
                try:
                    text = await b.inner_text()
                    aria = await b.get_attribute("aria-label")
                    role = await b.get_attribute("role")
                    val = await b.get_attribute("value")
                    print(f"[{i}] text={repr(text)} aria={repr(aria)} role={repr(role)} val={repr(val)}")
                except:
                    pass
            await browser.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(dump_buttons())
