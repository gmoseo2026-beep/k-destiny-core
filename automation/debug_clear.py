import asyncio
from playwright.async_api import async_playwright

async def clear():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = [p for p in browser.contexts[0].pages if "labs.google" in p.url][0]
        
        box = page.locator('div[role="textbox"][contenteditable="true"]').first
        await box.focus()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Backspace')
        print("Cleared prompt!")
        
        await browser.close()

asyncio.run(clear())
