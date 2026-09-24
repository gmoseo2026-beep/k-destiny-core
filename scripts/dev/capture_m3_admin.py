import asyncio
import json
import os
from playwright.async_api import async_playwright

ROOT_DIR = r"c:\Users\gmose\OneDrive\바탕 화면\k-destiny"
SCREENSHOT_DIR = os.path.join(ROOT_DIR, "docs", "screenshots")
FIXTURES_DIR = os.path.join(ROOT_DIR, "tests", "fixtures", "member")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

with open(os.path.join(FIXTURES_DIR, "session_standard.json"), encoding="utf-8") as f:
    SESSION_STANDARD = json.load(f)

with open(os.path.join(FIXTURES_DIR, "session_pass.json"), encoding="utf-8") as f:
    SESSION_PASS = json.load(f)

with open(os.path.join(FIXTURES_DIR, "reports_mine.json"), encoding="utf-8") as f:
    REPORTS_MINE = json.load(f)

with open(os.path.join(FIXTURES_DIR, "compat_history.json"), encoding="utf-8") as f:
    COMPAT_HISTORY = json.load(f)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)

        # 모바일 390px 캡처는 이미 성공적으로 완료되었으므로 스킵
        print("Mobile screenshots already captured. Proceeding to Admin preview tabs...")

        # ───────── 2. 데스크톱 1280px 어드민 미리보기 ─────────
        desktop_context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            device_scale_factor=1.5
        )
        page_admin = await desktop_context.new_page()
        page_admin.set_default_timeout(60000)
        print("Capturing Admin preview tabs from /ko/admin/preview...")
        await page_admin.goto("http://localhost:3000/ko/admin/preview", wait_until="domcontentloaded")
        await page_admin.wait_for_timeout(3000)

        # 1) 주문 탭
        shot_09 = os.path.join(SCREENSHOT_DIR, "09_admin_orders_preview.png")
        await page_admin.screenshot(path=shot_09)
        print(f"Captured: {shot_09}")

        # 2) 리포트 실패 관리 탭
        btn_reports = page_admin.locator("button:has-text('리포트 실패 관리')")
        if await btn_reports.count() > 0:
            await btn_reports.first.click()
            await page_admin.wait_for_timeout(1000)
            shot_10 = os.path.join(SCREENSHOT_DIR, "10_admin_reports_preview.png")
            await page_admin.screenshot(path=shot_10)
            print(f"Captured: {shot_10}")

        # 3) CS 수동 발급 탭
        btn_cs = page_admin.locator("button:has-text('CS 수동 발급')")
        if await btn_cs.count() > 0:
            await btn_cs.first.click()
            await page_admin.wait_for_timeout(1000)
            shot_11 = os.path.join(SCREENSHOT_DIR, "11_admin_cs_grant_preview.png")
            await page_admin.screenshot(path=shot_11)
            print(f"Captured: {shot_11}")

        # 4) 상품 지표 탭
        btn_metrics = page_admin.locator("button:has-text('상품 지표')")
        if await btn_metrics.count() > 0:
            await btn_metrics.first.click()
            await page_admin.wait_for_timeout(1000)
            shot_13 = os.path.join(SCREENSHOT_DIR, "13_admin_metrics_preview.png")
            await page_admin.screenshot(path=shot_13)
            print(f"Captured: {shot_13}")

        # 5) 상품 스위치 탭
        btn_products = page_admin.locator("button:has-text('상품 스위치')")
        if await btn_products.count() > 0:
            await btn_products.first.click()
            await page_admin.wait_for_timeout(1000)
            shot_12 = os.path.join(SCREENSHOT_DIR, "12_admin_products_visibility_preview.png")
            await page_admin.screenshot(path=shot_12)
            print(f"Captured: {shot_12}")

        await page_admin.close()
        await desktop_context.close()
        await browser.close()
        print("All screenshots successfully captured!")

if __name__ == "__main__":
    asyncio.run(main())
