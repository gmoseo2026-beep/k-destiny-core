import asyncio
from playwright.async_api import async_playwright
import urllib.parse
from pathlib import Path

async def test_intercept2():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        storage_url = None
        
        async def on_response(response):
            nonlocal storage_url
            if "media.getMediaUrlRedirect" in response.url:
                print(f"Intercepted response to {response.url[:50]}... with status {response.status}")
                if response.status in (301, 302, 303, 307, 308):
                    location = response.headers.get("location")
                    print(f"Location header: {location[:50]}...")
                    storage_url = location
                    
        page.on("response", on_response)
        
        url = await page.locator('video').last.get_attribute('src')
        url = url if url.startswith('http') else 'https://aitestkitchen.withgoogle.com' + url
        print(f"Triggering fetch for {url[:50]}...")
        
        # Trigger fetch (it will fail with CORS, but we will catch the 302!)
        await page.evaluate(f"fetch('{url}').catch(e => console.log('Fetch error:', e))")
        
        for _ in range(10):
            if storage_url:
                break
            await asyncio.sleep(1)
            
        if storage_url:
            print(f"SUCCESS! Got storage URL!")
            vid_resp = await page.context.request.get(storage_url)
            if vid_resp.ok:
                data = await vid_resp.body()
                out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(data)
                print(f"Saved {len(data)} bytes!")
            else:
                print("Failed to download storage URL")
        else:
            print("Failed to get storage URL from response interception.")
            
        await browser.close()
asyncio.run(test_intercept2())
