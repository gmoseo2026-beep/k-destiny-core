import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        selectors = [
            'button:has-text("Generate")',
            'button:has-text("생성")',
            'button[aria-label*="generate" i]',
            'button:has(i:has-text("arrow_forward"))',
            'button:has-text("Create")',
        ]
        
        for sel in selectors:
            loc = p.locator(sel)
            count = await loc.count()
            for i in range(count):
                el = loc.nth(i)
                if await el.is_visible():
                    html = await el.evaluate("el => el.outerHTML")
                    bb = await el.bounding_box()
                    print(f"Found with '{sel}' [{i}]: BBox {bb}, HTML: {html[:300]}")
                    
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
