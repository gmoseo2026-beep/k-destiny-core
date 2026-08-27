import sys

with open('automation/flow_rpa.py', 'r', encoding='utf-8') as f:
    code = f.read()

target_wait = """        # D1: 최소 대기 시간이 지났고, 타일 개수가 늘어났다면 완료 판정 시도
        elapsed = loop.time() - t0
        if elapsed > CONFIG.MIN_WAIT and current_count > baseline_count:
            new_tile = loc.nth(0)
            # 타일 내부에 진행률(%) 텍스트가 있으면 아직 생성 중인 것으로 간주
            if await new_tile.locator('text=/[0-9]+%/').count() > 0:
                pass # 아직 생성 중
            else:
                log.info("  생성 완료 (새 타일 발견 및 프로그레스 텍스트 없음)")
                try:
                    await page.wait_for_load_state("networkidle", timeout=10_000)
                except PWTimeout:
                    pass
                return new_tile"""

replacement_wait = """        # D1: 최소 대기 시간이 지났고, 타일 개수가 늘어났다면 완료 판정 시도
        elapsed = loop.time() - t0
        if elapsed > CONFIG.MIN_WAIT and current_count > baseline_count:
            new_tile = loc.nth(0)
            # 타일이 완전히 렌더링되었는지 확인 (video 태그 또는 blob 이미지 존재 여부)
            if await new_tile.locator('video, img[src^="blob:"]').count() > 0:
                log.info("  생성 완료 (타일 내 미디어 요소 확인)")
                try:
                    await page.wait_for_load_state("networkidle", timeout=10_000)
                except PWTimeout:
                    pass
                return new_tile"""

if target_wait in code:
    code = code.replace(target_wait, replacement_wait)
    with open('automation/flow_rpa.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("wait_new_result patched with video/blob check!")
else:
    print("Target not found in wait_new_result!")
