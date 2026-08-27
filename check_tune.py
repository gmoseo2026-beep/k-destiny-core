import asyncio
from playwright.async_api import async_playwright

async def check():
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

            btn = flow_page.locator('button:has-text("tune")')
            c = await btn.count()
            print("tune button count:", c)
            for i in range(c):
                print(f"[{i}] is_visible:", await btn.nth(i).is_visible())
                print(f"[{i}] inner_text:", repr(await btn.nth(i).inner_text()))

            # Print all button inner texts that contain 'Settings'
            btns = await flow_page.locator('button').all()
            for b in btns:
                txt = await b.inner_text()
                if "Settings" in txt or "설정" in txt or "tune" in txt:
                    print("Found button:", repr(txt), "vis:", await b.is_visible())

            await browser.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(check())
