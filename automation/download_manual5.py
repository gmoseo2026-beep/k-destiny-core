import asyncio, sys, io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright
import base64

async def get_vid():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        async def handle_route(route):
            print(f"Intercepted: {route.request.url}")
            response = await route.fetch()
            headers = response.headers
            headers["access-control-allow-origin"] = "*"
            await route.fulfill(response=response, headers=headers)
            
        await page.route("**/*", handle_route)
        
        videos = await page.locator('video').all()
        if len(videos) > 0:
            v = videos[0]
            src = await v.get_attribute('src')
            url = src if src.startswith('http') else 'https://aitestkitchen.withgoogle.com' + src
            print(f"Fetching via evaluate with CORS bypass {url}")
            
            b64 = await page.evaluate(f"""async () => {{
                const resp = await fetch("{url}");
                const blob = await resp.blob();
                return new Promise((resolve) => {{
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                }});
            }}""")
            
            data = base64.b64decode(b64)
            out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(data)
            print(f"Saved {len(data)} bytes to {out_path}")
        
        await page.unroute("**/*")
        await browser.close()
asyncio.run(get_vid())
