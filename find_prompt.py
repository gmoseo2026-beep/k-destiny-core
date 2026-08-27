import asyncio
from playwright.async_api import async_playwright

async def find_prompt():
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
            context = browser.contexts[0]
            flow_page = None
            for p in context.pages:
                if "labs.google" in p.url:
                    flow_page = p
                    break
            
            tas = await flow_page.locator("textarea").all()
            print("Found textareas:", len(tas))
            for ta in tas:
                print(await ta.is_visible())
                
            inputs = await flow_page.locator('div[contenteditable="true"]').all()
            print("Found contenteditables:", len(inputs))
            for el in inputs:
                print(await el.is_visible())
            
            await browser.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(find_prompt())
