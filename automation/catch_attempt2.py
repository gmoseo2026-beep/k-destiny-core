import asyncio
from playwright.async_api import async_playwright
import urllib.parse
from pathlib import Path

async def catch_attempt2():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        storage_url = None
        
        async def on_response(response):
            nonlocal storage_url
            if "media.getMediaUrlRedirect" in response.url and response.status in (301, 302, 303, 307, 308):
                loc = response.headers.get("location")
                if loc and "storage.googleapis.com" in loc:
                    print(f"Captured GCS URL: {loc[:50]}...")
                    storage_url = loc
                    
        page.on("response", on_response)
        print("Listening for ATTEMPT 2 video to finish generating (up to 15 mins)...")
        
        for _ in range(900): # 15 mins
            if storage_url:
                print("SUCCESS! Got storage URL!")
                vid_resp = await page.context.request.get(storage_url)
                if vid_resp.ok:
                    data = await vid_resp.body()
                    out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    out_path.write_bytes(data)
                    print(f"Saved {len(data)} bytes to {out_path}!")
                else:
                    print("Failed to download storage URL")
                break
            await asyncio.sleep(1)
            
        if not storage_url:
            print("Failed to get storage URL from response interception.")
            
        await browser.close()
asyncio.run(catch_attempt2())
