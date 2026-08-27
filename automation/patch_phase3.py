import ctypes
import sys

def patch_run_batch():
    with open('automation/run_batch.py', 'r', encoding='utf-8') as f:
        code = f.read()
    
    # 1. Add ctypes and sleep functions
    imports_target = "from playwright.async_api import async_playwright"
    imports_replacement = """import ctypes

from playwright.async_api import async_playwright

def prevent_sleep():
    try:
        # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001)
    except Exception:
        pass

def allow_sleep():
    try:
        # ES_CONTINUOUS
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000)
    except Exception:
        pass"""
        
    code = code.replace(imports_target, imports_replacement)
    
    # 2. Add prevent_sleep() at the start of produce()
    produce_target = """    generated_manifests = []
    rpa.log.info("배치 시작 | %s", credits.status_line())"""
    
    produce_replacement = """    prevent_sleep()
    generated_manifests = []
    rpa.log.info("배치 시작 (절전모드 방지 적용) | %s", credits.status_line())"""
    
    code = code.replace(produce_target, produce_replacement)
    
    # 3. Add allow_sleep() at the end of produce()
    end_target = """    rpa.log.info("배치 최종 종료 | %s", credits.status_line())
    return results"""
    
    end_replacement = """    rpa.log.info("배치 최종 종료 | %s", credits.status_line())
    allow_sleep()
    return results"""
    
    code = code.replace(end_target, end_replacement)
    
    # 4. CDP reconnect logic inside the loop
    # We will just change the structure to reconnect per job, or reconnect if page is closed.
    loop_target = """    # ---------------------------------------------------- 1. 생성 단계 (D12 분리)
    async with async_playwright() as pw:
        browser, context, page = await rpa.connect_browser(pw)
        try:
            await rpa.ensure_flow_settings(page)
            
            for jp in job_paths:
                if not credits.can_spend():
                    rpa.log.warning("크레딧 상한 도달 → 생성 중단(정상). %s", credits.status_line())
                    break
                job = json.loads(Path(jp).read_text(encoding="utf-8"))
                try:
                    manifest = await rpa.run_job(page, job)
                    generated_manifests.append((job, str(manifest)))
                except rpa.BudgetExhausted as b:
                    rpa.log.warning("크레딧 상한 → 생성 정상 종료. %s", b)
                    break
                except Exception as e:
                    rpa.log.error("생성 작업 실패 %s: %s", job.get("video_id"), e)
        finally:
            # D13: 종료 시 창은 닫지 않고 연결만 놓아줌. (원격 크롬이므로)
            try:
                # 연결이 여전히 살아있는지 확인
                is_connected = browser.is_connected()
                if not is_connected:
                    rpa.log.warning("CDP 연결이 이미 끊어졌습니다 (사용자가 창을 닫았을 수 있음).")
            except Exception:
                pass
            await browser.close()"""
            
    loop_replacement = """    # ---------------------------------------------------- 1. 생성 단계 (D12 분리)
    async with async_playwright() as pw:
        browser = None
        for jp in job_paths:
            if not credits.can_spend():
                rpa.log.warning("크레딧 상한 도달 → 생성 중단(정상). %s", credits.status_line())
                break
            
            job = json.loads(Path(jp).read_text(encoding="utf-8"))
            
            try:
                # 매 job 마다 CDP 연결 상태 확인 및 재연결 (크롬 뻗힘 복구력)
                if browser is None or not browser.is_connected():
                    rpa.log.info("CDP 연결 시도...")
                    browser, context, page = await rpa.connect_browser(pw)
                    await rpa.ensure_flow_settings(page)
                    
                manifest = await rpa.run_job(page, job)
                generated_manifests.append((job, str(manifest)))
            except rpa.BudgetExhausted as b:
                rpa.log.warning("크레딧 상한 → 생성 정상 종료. %s", b)
                break
            except Exception as e:
                rpa.log.error("생성 작업 실패 %s: %s", job.get("video_id"), e)
                # 에러 발생 시 브라우저 연결을 초기화하여 다음 루프에서 재연결 유도
                try:
                    if browser: await browser.close()
                except Exception:
                    pass
                browser = None
                
        # D13: 종료 시 창은 닫지 않고 연결만 놓아줌. (원격 크롬이므로)
        if browser:
            try:
                if not browser.is_connected():
                    rpa.log.warning("CDP 연결이 이미 끊어졌습니다 (사용자가 창을 닫았을 수 있음).")
                await browser.close()
            except Exception:
                pass"""

    code = code.replace(loop_target, loop_replacement)

    with open('automation/run_batch.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("run_batch.py patched for Phase 3 (Hardening)!")

if __name__ == '__main__':
    patch_run_batch()
