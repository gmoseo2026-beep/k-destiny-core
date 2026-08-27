import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        # 1. Hover first visible tile in the main grid
        tiles = await p.locator('[data-tile-id]').all()
        for t in tiles:
            bb = await t.bounding_box()
            if bb and await t.is_visible() and bb['y'] > 0 and bb['x'] < 500:
                print(f"Hovering tile at {bb}")
                await t.hover()
                await asyncio.sleep(2)
                
                # Check ALL buttons inside or near this tile
                buttons = await p.locator('button').all()
                for i, m in enumerate(buttons):
                    if await m.is_visible():
                        mbb = await m.bounding_box()
                        # If button is near the tile
                        if mbb and mbb['x'] > bb['x'] - 50 and mbb['x'] < bb['x'] + bb['width'] + 50 and mbb['y'] > bb['y'] - 50 and mbb['y'] < bb['y'] + bb['height'] + 50:
                            html = await m.evaluate("el => el.outerHTML")
                            print(f"  Button near tile [{i}] BBox: {mbb}")
                            print(f"  HTML: {html[:300]}")
                break
                
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
