import sys

with open('automation/flow_rpa.py', 'r', encoding='utf-8') as f:
    code = f.read()

target = """    # 텍스트 입력
    await page.keyboard.type(text)
    await asyncio.sleep(1.0)
    
    log.info(f"  프롬프트 전송 & 생성 시작({len(text)}자)")
    await page.keyboard.press("Enter")
    await asyncio.sleep(2.0)"""

replacement = """    # 텍스트 입력
    await page.keyboard.type(text)
    await asyncio.sleep(1.0)
    
    log.info(f"  프롬프트 전송 & 생성 시작({len(text)}자)")
    submit_btn = page.locator('button').filter(has=page.locator('i:has-text("arrow_forward")')).first
    if await submit_btn.count() > 0:
        await submit_btn.click(force=True)
    else:
        await page.keyboard.press("Enter")
    await asyncio.sleep(2.0)"""

if target in code:
    code = code.replace(target, replacement)
    with open('automation/flow_rpa.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print('Patched successfully!')
else:
    print('Target not found!')
