import asyncio, os, time, shutil
from pathlib import Path
from playwright.async_api import async_playwright


async def rescue_dl_pyautogui():
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0]
        
        print("Waiting for video tile to appear (up to 15 mins)...")
        tile_with_btn = page.locator('div:has(video):has(button[aria-haspopup="menu"])').last
        
        found = False
        for _ in range(900): # 15 mins
            if await tile_with_btn.count() > 0:
                found = True
                break
            await asyncio.sleep(1)
            
        if not found:
            print("No video tile with menu found after 15 minutes!")
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
        await dl_menu.click(force=True)
        
        print("Waiting 2s for Save As dialog...")
        await asyncio.sleep(2)
        print("Pressing Enter via PyAutoGUI...")
        import pyautogui
        pyautogui.FAILSAFE = False
        pyautogui.press('enter')
        
        print("Monitoring Downloads folder...")
        new_file = None
        for _ in range(60):
            await asyncio.sleep(1)
            mp4s_now = {p: p.stat().st_mtime for p in dl_dir.glob("*.mp4")}
            for p, mtime in mp4s_now.items():
                if p not in mp4s_before or mtime > mp4s_before.get(p, 0):
                    new_file = p
                    break
            if new_file:
                break
                
        if new_file:
            print(f"Detected new file: {new_file}")
            last_size = -1
            for _ in range(30):
                await asyncio.sleep(1)
                size = new_file.stat().st_size
                if size == last_size and size > 102400:
                    break
                last_size = size
                
            out_path = Path("C:/kd/out/karma_warn_1995/scene_01_00.mp4")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(new_file), str(out_path))
            print(f"Moved to {out_path}!")
        else:
            print("Download not detected!")
            
        await browser.close()

asyncio.run(rescue_dl_pyautogui())
