import asyncio
from playwright.async_api import async_playwright
import time

async def grab_placeholder():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        # Current count
        tiles = page.locator('[data-tile-id]')
        c = await tiles.count()
        print(f"Current tiles: {c}")
        
        # Type and generate
        box = page.locator('div[role="textbox"][contenteditable="true"]').first
        await box.focus()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Backspace')
        await page.keyboard.type("A tiny cute cat on a table", delay=10)
        
        btn = page.locator('button:has-text("arrow_forward")').first
        await btn.click()
        print("Clicked generate. Waiting for new tile...")
        
        while True:
            new_c = await page.locator('[data-tile-id]').count()
            if new_c > c:
                print(f"New tile found! count={new_c}")
                new_tile = page.locator('[data-tile-id]').nth(0)
                html = await new_tile.evaluate("el => el.outerHTML")
                with open("debug_placeholder.html", "w", encoding="utf-8") as f:
                    f.write(html)
                print("Saved debug_placeholder.html")
                break
            await asyncio.sleep(0.1)
                        
        await browser.close()

asyncio.run(grab_placeholder())
