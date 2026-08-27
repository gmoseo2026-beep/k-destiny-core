import asyncio, os, shutil
from pathlib import Path
from playwright.async_api import async_playwright

async def rescue_dl_init():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        # Override showSaveFilePicker BEFORE page loads!
        await page.add_init_script('''
            Object.defineProperty(window, 'showSaveFilePicker', {
                value: undefined,
                writable: true,
                configurable: true
            });
        ''')
        
        # Reload the page to apply the init script!
        print("Reloading page to disable File System Access API...")
        await page.reload()
        await page.wait_for_load_state("networkidle")
        
        # We need to find the video tile again
        tile_with_btn = page.locator('div:has(video):has(button[aria-haspopup="menu"])').last
        if await tile_with_btn.count() == 0:
            print("No video tile with menu found after reload!")
            await browser.close()
            return
            
        print("Found video tile. Hovering...")
        await tile_with_btn.hover()
        await asyncio.sleep(0.5)
        
        more_btn = tile_with_btn.locator('button[aria-haspopup="menu"]').last
        await more_btn.click(force=True)
        await asyncio.sleep(0.5)
        
        dl_menu = page.locator('[role="menuitem"]:has-text("Download"), div:has-text("Download")').first
        dl_dir = Path(os.path.expanduser("~")) / "Downloads"
        mp4s_before = {p: p.stat().st_mtime for p in dl_dir.glob("*.mp4")}
        
        print("Clicking Download...")
        await dl_menu.hover()
        await asyncio.sleep(0.5)
        
        async with page.expect_download(timeout=15000) as di:
            await dl_menu.click(force=True)
            
        d = await di.value
        out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        await d.save_as(str(out_path))
        print(f"Downloaded to {out_path}!")
        
        await browser.close()
        
asyncio.run(rescue_dl_init())
