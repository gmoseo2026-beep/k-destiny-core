import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        
        chat_panels = await p.locator('text="What do you want to create?"').all()
        if chat_panels:
            for panel in chat_panels:
                if await panel.is_visible():
                    parent = await panel.evaluate('el => el.closest("div[class*=\\"sc-\\u0022]") || el.parentElement.parentElement.parentElement')
                    html = await p.evaluate('el => el.outerHTML', parent)
                    with open('debug_chat.txt', 'w', encoding='utf-8') as f:
                        f.write(html)
                    break
        else:
            with open('debug_chat.txt', 'w', encoding='utf-8') as f:
                f.write("No chat panel found")
                
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
