import asyncio
from playwright.async_api import async_playwright

async def check_vid():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        tiles = await page.locator('[data-tile-id]').all()
        for i, t in enumerate(tiles):
            vid = t.locator('video')
            if await vid.count() > 0:
                src = await vid.first.get_attribute('src')
                print(f"Tile {i} video src: {src}")
                
                url = src if src.startswith('http') else 'https://aitestkitchen.withgoogle.com' + src
                print(f"Fetching {url} for redirect...")
                
                try:
                    resp = await context.request.get(url, max_redirects=0)
                    print(f"Status: {resp.status}")
                    print(f"Headers: {resp.headers}")
                    
                    if resp.status in (301, 302, 303, 307, 308):
                        location = resp.headers.get('location')
                        print(f"Redirecting to: {location}")
                        
                        if location:
                            print("Fetching the actual video...")
                            vid_resp = await context.request.get(location)
                            if vid_resp.ok:
                                data = await vid_resp.body()
                                print(f"Downloaded {len(data)} bytes")
                                with open('C:/kd/out/test_vid.mp4', 'wb') as f:
                                    f.write(data)
                                print("Saved to C:/kd/out/test_vid.mp4")
                            else:
                                print(f"Failed to fetch video: {vid_resp.status}")
                except Exception as e:
                    print(f"Error: {e}")
                break
                
        await browser.close()

asyncio.run(check_vid())
