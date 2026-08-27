import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        btn = p.locator('button:has(i:has-text("add_2"))').first
        if await btn.count() > 0:
            print("Clicking add_2 button...")
            await btn.click()
            await asyncio.sleep(2)
            
            dialogs = await p.locator('div[role="dialog"]').all()
            for i, d in enumerate(dialogs):
                if await d.is_visible():
                    html = await d.evaluate("el => el.outerHTML")
                    print(f"Opened dialog {i}")
                    with open(f"debug_new_dialog_{i}.txt", "w", encoding="utf-8") as f:
                        f.write(html)
        else:
            print("No add_2 button found")
            
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
