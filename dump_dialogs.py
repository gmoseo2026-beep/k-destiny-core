import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        # Check all dialogs
        dialogs = await p.locator('div[role="dialog"]').all()
        for i, d in enumerate(dialogs):
            if await d.is_visible():
                text = await d.inner_text()
                html = await d.evaluate("el => el.outerHTML")
                print(f"Dialog {i} text: {text[:100]}")
                with open(f"debug_dialog_{i}.txt", "w", encoding="utf-8") as f:
                    f.write(html)
                    
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
