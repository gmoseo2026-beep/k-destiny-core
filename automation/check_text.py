import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        all_text = await page.evaluate('document.body.innerText')
        print("Page Text Snapshot:")
        print(all_text[:1000]) # Print first 1000 chars
        print("...")
        print(all_text[-1000:]) # Print last 1000 chars
        await browser.close()
asyncio.run(check())
