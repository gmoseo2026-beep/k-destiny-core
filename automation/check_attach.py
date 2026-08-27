import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        print("Clicking attach button (+)...")
        add_btn = page.locator('button:has(i:has-text("add_2")), button[aria-label*="image" i], button:has(i:has-text("add"))').first
        if await add_btn.count() > 0 and await add_btn.is_visible():
            await add_btn.click(force=True)
            await asyncio.sleep(2)
            await page.screenshot(path='C:/kd/out/flow_attach_menu.png')
            print("Screenshot saved to C:/kd/out/flow_attach_menu.png")
            
            # Print visible dialogs or menus
            menus = await page.locator('[role="menu"], [role="dialog"], [role="listbox"]').all()
            for i, m in enumerate(menus):
                if await m.is_visible():
                    text = await m.evaluate('e => e.innerText')
                    print(f"Menu/Dialog {i} text:\n{text}\n")
        else:
            print("Attach button not found.")
            
        await browser.close()

asyncio.run(check())
