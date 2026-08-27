import asyncio, sys, io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

async def get_vid():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        videos = await page.locator('video').all()
        if len(videos) > 0:
            v = videos[0]
            src = await v.get_attribute('src')
            url = src if src.startswith('http') else 'https://aitestkitchen.withgoogle.com' + src
            print(f"Triggering download for {url}")
            
            # Create a link and click it
            await page.evaluate(f'''
                const a = document.createElement('a');
                a.href = "{url}";
                a.download = "video.mp4";
                document.body.appendChild(a);
                a.click();
            ''')
            
            # Wait for download using expect_download?
            # We can't use expect_download because we already clicked it.
            # We must wrap it in expect_download!
        await browser.close()

async def test_dl():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        videos = await page.locator('video').all()
        if len(videos) > 0:
            v = videos[0]
            src = await v.get_attribute('src')
            url = src if src.startswith('http') else 'https://aitestkitchen.withgoogle.com' + src
            
            print("Triggering standard download...")
            async with page.expect_download(timeout=15000) as di:
                await page.evaluate(f'''
                    const a = document.createElement('a');
                    a.href = "{url}";
                    a.download = "video.mp4";
                    document.body.appendChild(a);
                    a.click();
                ''')
                
            d = await di.value
            out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            await d.save_as(str(out_path))
            print(f"Downloaded to {out_path}!")
        await browser.close()

asyncio.run(test_dl())
