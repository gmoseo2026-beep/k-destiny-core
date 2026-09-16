import asyncio
import json
import os
import urllib.request
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\gmose\.gemini\antigravity-ide\brain\9f899ce8-44b7-44e5-ac8c-4b4ff736fb4a"
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def create_test_compat():
    url = "http://localhost:3000/api/compat"
    payload = {
        "relation": "love",
        "personA": {
            "name": "민수",
            "gender": "M",
            "dob": "1998-05-12",
            "time": "14:30"
        },
        "personB": {
            "name": "지은",
            "gender": "F",
            "dob": "1999-08-23",
            "time": ""
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Created compat: ID={data.get('id')}, shareToken={data.get('shareToken')}")
            return data.get("shareToken") or data.get("id")
    except Exception as e:
        print(f"Error creating compat: {e}")
        return None

async def measure_and_screenshot():
    compat_token = await create_test_compat()
    
    pages_to_test = [
        ("home", "http://localhost:3000/ko"),
        ("compat_new", "http://localhost:3000/ko/compat/new"),
        ("pricing", "http://localhost:3000/ko/pricing"),
        ("annual_fortune", "http://localhost:3000/ko/fortune/annual"),
    ]
    if compat_token:
        pages_to_test.append(("compat_result", f"http://localhost:3000/ko/compat/{compat_token}"))
    
    results = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        # Mobile viewport emulation (iPhone 14: 390x844)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )

        for name, url in pages_to_test:
            page = await context.new_page()
            
            # Inject PerformanceObserver to accurately record LCP, FCP, and CLS
            await page.add_init_script("""
                window.__vitals = { lcp: 0, fcp: 0, cls: 0 };
                try {
                    new PerformanceObserver((entryList) => {
                        for (const entry of entryList.getEntries()) {
                            if (entry.name === 'first-contentful-paint') {
                                window.__vitals.fcp = entry.startTime;
                            }
                        }
                    }).observe({ type: 'paint', buffered: true });

                    new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        if (entries.length > 0) {
                            window.__vitals.lcp = entries[entries.length - 1].startTime;
                        }
                    }).observe({ type: 'largest-contentful-paint', buffered: true });

                    let clsValue = 0;
                    new PerformanceObserver((entryList) => {
                        for (const entry of entryList.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                                window.__vitals.cls = clsValue;
                            }
                        }
                    }).observe({ type: 'layout-shift', buffered: true });
                } catch(e) {}
            """)

            t0 = asyncio.get_event_loop().time()
            response = await page.goto(url, wait_until="networkidle")
            t_load = (asyncio.get_event_loop().time() - t0) * 1000

            # Wait a little for any animations/renders to settle
            await page.wait_for_timeout(1000)

            # Retrieve performance metrics
            vitals = await page.evaluate("""() => {
                const nav = performance.getEntriesByType('navigation')[0] || {};
                const resources = performance.getEntriesByType('resource') || [];
                let totalTransferSize = 0;
                let jsTransferSize = 0;
                let imgTransferSize = 0;

                for (const r of resources) {
                    const sz = r.transferSize || 0;
                    totalTransferSize += sz;
                    if (r.initiatorType === 'script' || r.name.endsWith('.js')) {
                        jsTransferSize += sz;
                    } else if (r.initiatorType === 'img' || r.name.match(/\\.(png|webp|jpg|svg)/)) {
                        imgTransferSize += sz;
                    }
                }

                return {
                    fcp: Math.round(window.__vitals?.fcp || 0),
                    lcp: Math.round(window.__vitals?.lcp || 0),
                    cls: Number((window.__vitals?.cls || 0).toFixed(4)),
                    ttfb: Math.round(nav.responseStart - nav.requestStart || 0),
                    domInteractive: Math.round(nav.domInteractive || 0),
                    duration: Math.round(nav.duration || 0),
                    totalTransferKB: Math.round(totalTransferSize / 1024),
                    jsTransferKB: Math.round(jsTransferSize / 1024),
                    imgTransferKB: Math.round(imgTransferSize / 1024)
                };
            }""")

            # Screenshot viewport
            shot_path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
            await page.screenshot(path=shot_path, full_page=False)
            print(f"Captured {name} -> {shot_path} (LCP={vitals['lcp']}ms, CLS={vitals['cls']}, JS={vitals['jsTransferKB']}KB)")

            results[name] = {
                "url": url,
                "status": response.status if response else 0,
                "vitals": vitals,
                "load_ms": round(t_load),
                "screenshot": shot_path
            }

            await page.close()

        await browser.close()

    print("\n--- RESULTS JSON ---")
    print(json.dumps(results, indent=2, ensure_ascii=False))

    with open(os.path.join(ARTIFACT_DIR, "perf_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    asyncio.run(measure_and_screenshot())
