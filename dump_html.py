import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as pw:
        b = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        p = b.contexts[0].pages[0]
        html = await p.content()
        with open('body_html.txt', 'w', encoding='utf-8') as f:
            f.write(html)
        await b.close()

if __name__ == '__main__':
    asyncio.run(run())
