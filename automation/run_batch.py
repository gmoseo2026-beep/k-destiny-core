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

from playwright.async_api import async_playwright
import flow_rpa as rpa
import credits
import assemble


async def produce(job_paths):
    generated_manifests = []
    rpa.log.info("배치 시작 | %s", credits.status_line())
    
    # ---------------------------------------------------- 1. 생성 단계 (D12 분리)
    async with async_playwright() as pw:
        browser, context, page = await rpa.connect_browser(pw)
        try:
            await rpa.ensure_model_lower_priority(page)
            await rpa.ensure_outputs_per_prompt(page, n=1)
            
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
            await browser.close()
            
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
    print(f"\n📋 업로드 예약표: {out_csv} ({len(rows)}편)")


if __name__ == "__main__":
    jobs = sys.argv[1:] or [str(p) for p in sorted(Path("jobs").glob("*.json"))]
    if not jobs:
        print("jobs/ 폴더에 .json 을 넣거나 인자로 경로를 주세요.")
        sys.exit(1)
    res = asyncio.run(produce(jobs))
    write_upload_manifest(res)
