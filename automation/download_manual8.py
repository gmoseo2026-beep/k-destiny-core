import asyncio
import sys, io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def get_vid():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        # Get cookies
        cookies = await context.cookies('https://aitestkitchen.withgoogle.com')
        cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
        
        headers = {
            'Cookie': cookie_str,
            'Referer': 'https://aitestkitchen.withgoogle.com/tools/video-prompting',
            'User-Agent': await page.evaluate('navigator.userAgent')
        }
        
        videos = await page.locator('video').all()
        if len(videos) > 0:
            v = videos[0]
            src = await v.get_attribute('src')
            url = src if src.startswith('http') else 'https://aitestkitchen.withgoogle.com' + src
            print(f"Fetching redirect for {url}")
            resp = await context.request.get(url, max_redirects=0, headers=headers)
            
            location = url
            print(f"Status: {resp.status}")
            if resp.status in (301, 302, 303, 307, 308):
                location = resp.headers.get('location', url)
                
            print(f"Downloading from {location}")
            # GCS URL doesn't need cookies or referer
            vid_resp = await context.request.get(location)
            if vid_resp.ok:
                data = await vid_resp.body()
                out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(data)
                print(f"Saved {len(data)} bytes to {out_path}")
            else:
                print(f"Failed HTTP {vid_resp.status} - {await vid_resp.text()}")
        await browser.close()
asyncio.run(get_vid())
