import asyncio
import json
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
        
        # 2. Click More options
        more = await p.locator('button:has-text("More options")').all()
        if more:
            for m in more:
                if await m.is_visible():
                    await m.click()
                    await asyncio.sleep(1)
                    break
                    
        # 3. Dump via evaluate
        res = await p.evaluate('''() => {
            const els = Array.from(document.querySelectorAll('*'));
            return els.filter(e => {
                const text = (e.innerText || '').trim();
                const role = e.getAttribute('role');
                return (text.toLowerCase().includes('download') || text.toLowerCase().includes('save') || role === 'menuitem');
            }).map(e => ({
                tag: e.tagName,
                text: (e.innerText || '').trim().replace(/\\n/g, ' '),
                role: e.getAttribute('role'),
                className: e.className
            }));
        }''')
        
        with open('debug_fast.txt', 'w', encoding='utf-8') as f:
            f.write(json.dumps(res, indent=2))
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
