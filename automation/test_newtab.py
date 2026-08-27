import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def check_vid():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        # We know the src from earlier:
        src = "/fx/api/trpc/media.getMediaUrlRedirect?name=60353a04-77cd-4989-b885-03e19f6d150f"
        url = 'https://aitestkitchen.withgoogle.com' + src
        
        print(f"Opening new page to download: {url}")
        new_page = await context.new_page()
        
        # We can intercept the response!
        response_data = None
        async def handle_response(response):
            nonlocal response_data
            if response.url.endswith('.mp4') or 'getMediaUrlRedirect' in response.url:
                if response.status == 200:
                    try:
                        response_data = await response.body()
                        print(f"Captured {len(response_data)} bytes from {response.url}")
                    except Exception as e:
                        print(f"Failed to read body: {e}")

        new_page.on("response", handle_response)
        
        try:
            await new_page.goto(url, wait_until='domcontentloaded', timeout=15000)
            await asyncio.sleep(5)
            if response_data:
                with open('C:/kd/out/test_vid_new.mp4', 'wb') as f:
                    f.write(response_data)
                print("Saved to test_vid_new.mp4")
            else:
                print("No response data captured.")
        except Exception as e:
            print(f"Navigation error: {e}")
            
        await new_page.close()
        await browser.close()

asyncio.run(check_vid())
