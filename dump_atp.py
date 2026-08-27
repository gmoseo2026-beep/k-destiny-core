import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        btns = await p.locator('button:has-text("Add to Prompt")').all()
        for i, el in enumerate(btns):
            vis = await el.is_visible()
            bb = await el.bounding_box()
            html = await el.evaluate("el => el.outerHTML")
            print(f"[{i}] vis={vis} BBox={bb} HTML={html[:200]}")
            
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
