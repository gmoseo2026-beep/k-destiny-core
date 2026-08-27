import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        box = p.locator('textarea, div[contenteditable="true"][role="textbox"], [placeholder*="prompt" i]').first
        if await box.count() > 0:
            parent = await box.evaluate("el => el.parentElement.parentElement.parentElement.outerHTML")
            with open("debug_prompt_area.txt", "w", encoding="utf-8") as f:
                f.write(parent)
            print("Dumped prompt area HTML")
        else:
            print("Prompt input not found")
            
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
