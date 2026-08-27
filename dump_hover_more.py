import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        # We know the first tile in the main grid has data-tile-id
        # Let's get the main grid tiles by looking for images
        tiles = await p.locator('div[data-tile-id]').all()
        # Find one that is large
        for t in tiles:
            bb = await t.bounding_box()
            if bb and bb['width'] > 100:
                print(f"Hovering tile at {bb}")
                await t.hover()
                await asyncio.sleep(1)
                
                # Now find ALL More options buttons on the whole page
                more = await p.locator('button:has-text("More options")').all()
                for i, m in enumerate(more):
                    if await m.is_visible():
                        mbb = await m.bounding_box()
                        print(f"  More btn [{i}] BBox: {mbb}")
                break
                
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
