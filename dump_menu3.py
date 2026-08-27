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
                    
        # 3. Dump all visible text and tag names for debugging
        els = await p.locator('*:visible').all()
        with open('debug_visible.txt', 'w', encoding='utf-8') as f:
            for e in els:
                try:
                    text = await e.inner_text()
                    if text.strip() and len(text) < 50:
                        tag = await e.evaluate("el => el.tagName")
                        f.write(f"[{tag}] {text.strip()}\n")
                except Exception:
                    pass
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
