import asyncio
from playwright.async_api import async_playwright

async def dump_hover():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        tiles = await page.locator('[data-tile-id]').all()
        if not tiles:
            return
        await tiles[0].hover()
        await asyncio.sleep(1)
        
        menus = await tiles[0].locator('button:has-text("More options")').all()
        if menus:
            await menus[0].click()
            await asyncio.sleep(1)
            
            # 덤프
            html = await page.locator('body').inner_html()
            with open("body_html.txt", "w", encoding="utf-8") as f:
                f.write(html)
        await browser.close()

if __name__ == '__main__':
    asyncio.run(dump_hover())
