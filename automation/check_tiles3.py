import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        tiles = await page.locator('[data-tile-id]').all()
        print(f'Found {len(tiles)} tiles.')
        for i, t in enumerate(tiles):
            v = await t.locator('video').count()
            i_b = await t.locator('img[src^="blob:"]').count()
            print(f'Tile {i}: video={v}, blob_img={i_b}')
        await browser.close()
asyncio.run(check())
