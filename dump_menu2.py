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
        
        # 2. Click More options
        more = await p.locator('button:has-text("More options")').all()
        if more:
            for m in more:
                if await m.is_visible():
                    await m.click()
                    await asyncio.sleep(1)
                    break
                    
        # 3. Dump HTML
        html = await p.content()
        with open('debug_menu.txt', 'w', encoding='utf-8') as f:
            f.write(html)
            
        # 4. Also dump bounding boxes of anything containing "Download"
        els = await p.locator('text=/Download/i').all()
        for e in els:
            if await e.is_visible():
                bb = await e.bounding_box()
                tag = await e.evaluate("el => el.tagName")
                classes = await e.evaluate("el => el.className")
                print(f"Visible Download text found: {tag} class={classes} bbox={bb}")
                
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
