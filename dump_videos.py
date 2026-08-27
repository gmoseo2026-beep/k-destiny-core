import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        videos = await p.locator('video').all()
        res = []
        for i, v in enumerate(videos):
            if await v.is_visible():
                bb = await v.bounding_box()
                src = await v.get_attribute('src')
                html = await v.evaluate("el => el.outerHTML")
                parent = await v.evaluate("el => el.parentElement.outerHTML")
                res.append({
                    'index': i,
                    'bbox': bb,
                    'src': src,
                    'html': html[:200],
                    'parent': parent[:200]
                })
                
        with open('debug_videos.json', 'w', encoding='utf-8') as f:
            json.dump(res, f, indent=2)
            
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
