import asyncio, os, time
from pathlib import Path
from playwright.async_api import async_playwright

async def test_dl():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        tiles = await page.locator('[data-tile-id]').all()
        if len(tiles) > 0:
            t = tiles[0]
            await t.hover()
            await asyncio.sleep(0.5)
            
            more_btn = t.locator('button[aria-haspopup="menu"]').last
            await more_btn.click()
            await asyncio.sleep(0.5)
            
            dl_menu = page.locator('[role="menuitem"]:has-text("Download"), div:has-text("Download")').first
            await dl_menu.hover()
            await asyncio.sleep(0.5)
            
            dl_dir = Path(os.path.expanduser("~")) / "Downloads"
            # Get max mtime of mp4s in downloads before click
            mp4s_before = {p: p.stat().st_mtime for p in dl_dir.glob("*.mp4")}
            
            print("Clicking download...")
            await dl_menu.click()
            
            print("Waiting for file in Downloads...")
            new_file = None
            for _ in range(30):
                await asyncio.sleep(1)
                mp4s_now = {p: p.stat().st_mtime for p in dl_dir.glob("*.mp4")}
                for p, mtime in mp4s_now.items():
                    if p not in mp4s_before or mtime > mp4s_before[p]:
                        new_file = p
                        break
                if new_file:
                    break
            
            if new_file:
                print(f"Detected new file: {new_file}")
                # Wait for file to finish downloading (size stops changing)
                last_size = -1
                for _ in range(20):
                    await asyncio.sleep(0.5)
                    size = new_file.stat().st_size
                    if size == last_size and size > 0:
                        break
                    last_size = size
                
                out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
                out_path.parent.mkdir(parents=True, exist_ok=True)
                import shutil
                shutil.move(str(new_file), str(out_path))
                print(f"Moved to {out_path}!")
            else:
                print("Download not detected in Downloads folder.")
        await browser.close()
asyncio.run(test_dl())
