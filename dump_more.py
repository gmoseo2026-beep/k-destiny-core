import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        # 1. Hover first tile
        tiles = await p.locator('[data-tile-id]').all()
        if not tiles:
            return
        await tiles[0].hover()
        await asyncio.sleep(1)
        
        # 2. Find ALL "More options" buttons
        more = await p.locator('button:has-text("More options")').all()
        for i, m in enumerate(more):
            if await m.is_visible():
                bb = await m.bounding_box()
                html = await m.evaluate("el => el.outerHTML")
                parent = await m.evaluate("el => el.parentElement.outerHTML")
                print(f"[{i}] BBox: {bb}")
                print(f"HTML: {html[:200]}")
                print(f"Parent: {parent[:200]}\n")
                
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
