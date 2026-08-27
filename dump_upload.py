import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        finp = p.locator('input[type="file"]').first
        if await finp.count() > 0:
            print("Uploading file...")
            await finp.set_input_files("assets/master_karma_calm.webp.jpg")
            await asyncio.sleep(2)
            
            dialogs = await p.locator('div[role="dialog"]').all()
            print(f"Dialogs open after upload: {len(dialogs)}")
        else:
            print("File input not found")
            
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
