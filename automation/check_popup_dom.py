import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        # 1. Click bottom + button
        print("Clicking bottom + button...")
        btns = await page.locator('button:has(i:has-text("add"))').all()
        for b in btns:
            if await b.is_visible():
                bb = await b.bounding_box()
                if bb and bb['y'] > 700:
                    await b.click(force=True)
                    print(f"Clicked bottom + button at {bb['y']:.0f}")
                    break
        await asyncio.sleep(2)
        
        # Print all buttons
        buttons = await page.locator('button').all()
        for i, b in enumerate(buttons):
            if await b.is_visible():
                text = await b.evaluate('e => e.innerText')
                role = await b.evaluate('e => e.getAttribute("role")')
                print(f"Button {i}: role='{role}', text='{text}'")
                
        # Print all dialogs
        dialogs = await page.locator('[role="dialog"]').all()
        for i, d in enumerate(dialogs):
            if await d.is_visible():
                print(f"Dialog {i} found.")
                
        # Print images
        imgs = await page.locator('img').all()
        for i, img in enumerate(imgs):
            if await img.is_visible():
                src = await img.evaluate('e => e.getAttribute("src")')
                print(f"Img {i}: src={src[:50] if src else None}")
                
        await browser.close()

asyncio.run(check())
