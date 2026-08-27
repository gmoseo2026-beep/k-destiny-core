import asyncio
from playwright.async_api import async_playwright

async def debug():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        # Check for overlays
        overlays = await page.locator('div[data-state="open"]').all()
        print(f"data-state=open divs: {len(overlays)}")
        for i, ov in enumerate(overlays):
            cls = await ov.get_attribute("class") or ""
            vis = await ov.is_visible()
            print(f"  [{i}] visible={vis} class={cls[:60]}")
        
        # Check for dialogs
        dialogs = await page.locator('[role="dialog"]').all()
        print(f"role=dialog elements: {len(dialogs)}")
        for i, d in enumerate(dialogs):
            vis = await d.is_visible()
            txt = (await d.inner_text())[:100] if vis else "(hidden)"
            print(f"  [{i}] visible={vis} text={repr(txt)}")
        
        # Check all visible buttons
        buttons = await page.locator("button").all()
        visible_buttons = []
        for b in buttons:
            if await b.is_visible():
                txt = (await b.inner_text()).replace("\n", "\\n")[:40]
                visible_buttons.append(txt)
        print(f"Visible buttons ({len(visible_buttons)}):")
        for t in visible_buttons:
            print(f"  {repr(t)}")
        
        # Check textbox
        tb = page.locator('div[role="textbox"]').first
        print(f"\nTextbox count: {await tb.count()}")
        if await tb.count() > 0:
            print(f"Textbox visible: {await tb.is_visible()}")
            bb = await tb.bounding_box()
            print(f"Textbox bounding_box: {bb}")
        
        await browser.close()

asyncio.run(debug())
