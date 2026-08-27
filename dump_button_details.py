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
                
                # Check ALL buttons inside or near this tile
                buttons = await p.locator('button').all()
                for i, m in enumerate(buttons):
                    if await m.is_visible():
                        mbb = await m.bounding_box()
                        if mbb and mbb['x'] > bb['x'] - 50 and mbb['x'] < bb['x'] + bb['width'] + 50 and mbb['y'] > bb['y'] - 50 and mbb['y'] < bb['y'] + bb['height'] + 50:
                            html = await m.evaluate("el => el.outerHTML")
                            text = await m.inner_text()
                            label = await m.get_attribute("aria-label")
                            print(f"Button {i} HTML: {html}")
                            print(f"Text: '{text}', aria-label: '{label}'\n")
                break
                
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
