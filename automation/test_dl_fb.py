import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        page = browser.contexts[0].pages[0]
        
        await page.add_init_script('''
            Object.defineProperty(window, 'showSaveFilePicker', {
                value: undefined,
                writable: true,
                configurable: true
            });
        ''')
        await page.reload()
        
        # Wait for video to render
        print("Waiting for video...")
        try:
            await page.locator('video').last.wait_for(timeout=30000)
        except:
            print("Video not found!")
            await browser.close()
            return
            
        print("Video found!")
        tile_with_btn = page.locator('div:has(video):has(button[aria-haspopup="menu"])').last
        await tile_with_btn.hover()
        await asyncio.sleep(0.5)
        
        more_btn = tile_with_btn.locator('button[aria-haspopup="menu"]').last
        await more_btn.click(force=True)
        await asyncio.sleep(0.5)
        
        dl_menu = page.locator('[role="menuitem"]:has-text("Download"), div:has-text("Download")').first
        await dl_menu.hover()
        await asyncio.sleep(0.5)
        
        await page.evaluate('''
            window.lastHref = null;
            document.body.addEventListener('click', (e) => {
                let node = e.target;
                while (node) {
                    if (node.tagName === 'A' && node.hasAttribute('download')) {
                        window.lastHref = node.href;
                    }
                    node = node.parentElement;
                }
            }, {capture: true});
        ''')
        
        print("Clicking download...")
        await dl_menu.click(force=True)
        await asyncio.sleep(2)
        
        href = await page.evaluate('window.lastHref')
        print(f'Fallback href: {href}')
        
        await browser.close()
asyncio.run(main())
