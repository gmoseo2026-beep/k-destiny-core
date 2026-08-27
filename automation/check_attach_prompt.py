import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        print("Clicking attach button inside prompt box (+)...")
        btns = await page.locator('button:has(i:has-text("add"))').all()
        for b in btns:
            if await b.is_visible():
                bb = await b.bounding_box()
                if bb and bb['y'] > 700:  # Bottom area
                    await b.click(force=True)
                    print(f"Clicked bottom + button at {bb['y']:.0f}")
                    await asyncio.sleep(2)
                    await page.screenshot(path='C:/kd/out/flow_attach_prompt.png')
                    print("Screenshot saved to C:/kd/out/flow_attach_prompt.png")
                    break
        else:
            print("Bottom attach button not found.")
            
        await browser.close()

asyncio.run(check())
