import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        tiles = await p.locator('[data-tile-id]').all()
        res = []
        for t in tiles:
            bb = await t.bounding_box()
            if bb and await t.is_visible() and bb['y'] > 0 and bb['y'] < 2000:
                tid = await t.get_attribute('data-tile-id')
                res.append({'id': tid, 'bbox': bb})
                
        with open('debug_tiles_visible.json', 'w') as f:
            json.dump(res, f, indent=2)
            
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
