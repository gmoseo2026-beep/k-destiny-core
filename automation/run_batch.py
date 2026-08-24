#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
run_batch.py — 야간 무인 배치: Flow 생성 → 자막·BGM 조립 → 업로드 예약표
=====================================================================
jobs/*.json 을 순서대로:
  1) flow_rpa.run_job (Veo3 생성/연장/다운로드, 크레딧 가드)
  2) assemble.build_from_manifest (자막+BGM 완성본 = CapCut 대체)
  3) upload_manifest.csv 갱신(수동 예약용)
크레딧 상한(월 4000) 도달 시 남은 작업을 건너뛰고 정상 종료.
"""

import asyncio
import csv
import json
import sys
import traceback
from pathlib import Path

import ctypes

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
        pass
import flow_rpa as rpa
import credits
import assemble


async def produce(job_paths):
    if not rpa.CONFIG.PHASE0_VERIFIED:
        raise RuntimeError(
            "Phase 0.5 미검증 상태입니다. 지금 실행하면 (1) 다운로드가 실패하거나 "
            "(2) 엉뚱한 타일을 받거나 (3) 잘못된 모델이 선택될 수 있습니다.\n"
            "automation/FLOW_UI_FACTS.md 의 F4·F6·F9 를 채우고 반영한 뒤 "
            "CONFIG.PHASE0_VERIFIED = True 로 바꾸세요."
        )
        
    prevent_sleep()
    generated_manifests = []
    rpa.log.info("배치 시작 (절전모드 방지 적용) | %s", credits.status_line())
    
    # ---------------------------------------------------- 1. 생성 단계 (D12 분리)
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
                pass
            
    rpa.log.info("=== 모든 생성 단계 완료, 조립(Assemble) 시작 ===")

    # ---------------------------------------------------- 2. 조립 단계 (D12 분리)
    # 이벤트 루프를 막지 않기 위해(여기서는 이미 브라우저를 닫았으므로 상관없지만 분리가 원칙)
    results = []
    for job, manifest_path in generated_manifests:
        try:
            rpa.log.info("조립 시작: %s", job.get("video_id"))
            # 동기 함수를 비동기로 호출 (또는 브라우저 연결을 닫았으므로 동기 호출도 가능)
            final = await asyncio.to_thread(assemble.build_from_manifest, manifest_path)
            results.append((job, str(final)))
        except Exception as e:
            rpa.log.error("조립 작업 실패 %s: %s", job.get("video_id"), e)
            traceback.print_exc()

    rpa.log.info("배치 최종 종료 | %s", credits.status_line())
    allow_sleep()
    return results


def write_upload_manifest(results, out_csv="upload_manifest.csv"):
    if not results:
        return
    rows = [{
        "final_file": final,
        "video_id": job.get("video_id", ""),
        "title": job.get("title_ko", ""),
        "caption_hashtags": job.get("caption_hashtags", ""),
        "schedule_slot": job.get("schedule_slot", ""),
        "thumbnail_prompt": job.get("thumbnail_prompt", ""),
    } for job, final in results]
    with open(out_csv, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"\n[Upload Manifest]: {out_csv} ({len(rows)}건)")


if __name__ == "__main__":
    jobs_dir = Path(__file__).resolve().parent / "jobs"
    jobs = sys.argv[1:] or [str(p) for p in sorted(jobs_dir.glob("*.json"))]
    if not jobs:
        print("jobs/ 폴더에 .json 을 넣거나 인자로 경로를 주세요.")
        sys.exit(1)
    res = asyncio.run(produce(jobs))
    write_upload_manifest(res)
