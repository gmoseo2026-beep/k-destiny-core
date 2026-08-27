import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        # Hover top left tile
        tiles = await p.locator('[data-tile-id]').all()
        for t in tiles:
            bb = await t.bounding_box()
            if bb and await t.is_visible() and bb['y'] > 0 and bb['x'] < 500:
                await t.hover()
                await asyncio.sleep(2)
                
                # Check if we can find the button using result_locator.locator
                m = t.locator('button:has-text("more_vert")')
                if await m.count() > 0 and await m.first.is_visible():
                    print("Found inside tile!")
                else:
                    print("Not found inside tile. Let's find its parent...")
                    
                break
                
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
