#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
credits.py — 월별 크레딧 예산 가드 (월 4000 상한 절대 초과 방지)
=====================================================================
Google Flow의 Veo 생성은 크레딧을 소모한다. 이 모듈은 '이번 달 쓴 크레딧'을
로컬 원장(credit_ledger.json)에 누적하고, 다음 생성이 상한을 넘길 것 같으면
막는다. 야간 무인 배치가 폭주해도 4000을 넘지 않게 하는 핵심 안전장치.

- 원장은 월(YYYY-MM) 단위로 자동 분리 → 달이 바뀌면 자동으로 예산 리셋.
- 생성(초기/Extend) 1회마다 record()로 비용을 적립.
- can_spend()이 False면 배치를 '정상 종료'(에러 아님)한다.

⚠️ CREDITS_PER_GENERATION 은 반드시 실제 값으로 보정하세요.
   Flow에서 veo3-fast(Lower Priority)로 1회 생성 후 화면의 크레딧 잔액이
   얼마나 줄었는지 보고 그 숫자를 넣으면 됩니다(초기·Extend 각각 1회로 계산).
"""

import datetime
import json
import logging
from pathlib import Path

# D3: 현재 작업 디렉터리가 아닌 파일 위치 기준 절대 경로 사용
LEDGER = Path(__file__).resolve().parent / "credit_ledger.json"

MONTHLY_BUDGET = 4000              # 월 상한 (요청: 4000 초과 금지)
CREDITS_PER_GENERATION = 10        # Phase 1 확정단가 적용
SAFETY_MARGIN = 0                  # 여유분(예: 100이면 3900에서 멈춤)

log = logging.getLogger("flow_rpa")


def _month() -> str:
    return datetime.datetime.now().strftime("%Y-%m")


def _load() -> dict:
    if not LEDGER.exists():
        # D3: 원장 무결성 경고 (월 중순 이후인데 원장이 없으면 의심)
        if datetime.datetime.now().day > 15:
            log.warning("원장이 없습니다 — 경로가 바뀌었을 수 있습니다. 상한 가드가 무력화될 위험.")
        return {}
    try:
        return json.loads(LEDGER.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save(data: dict):
    LEDGER.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def spent(month: str = None) -> float:
    month = month or _month()
    data = _load()
    # D4: state가 "void"가 아닌 항목만 합산
    entries = data.get(month, {}).get("entries", [])
    return sum(e["cost"] for e in entries if e.get("state", "confirmed") != "void")


def remaining(month: str = None) -> float:
    return (MONTHLY_BUDGET - SAFETY_MARGIN) - spent(month)


def can_spend(cost: float = None) -> bool:
    cost = CREDITS_PER_GENERATION if cost is None else cost
    return remaining() >= cost


def record(cost: float = None, meta: str = "", state: str = "pending") -> str:
    """
    크레딧을 기록한다.
    state: "pending", "confirmed", "void"
    고유 id(생성시간 기반)를 반환해 나중에 상태를 업데이트할 수 있게 함.
    """
    cost = CREDITS_PER_GENERATION if cost is None else cost
    data = _load()
    m = _month()
    bucket = data.setdefault(m, {"entries": []})
    entry_id = datetime.datetime.now().isoformat(timespec="milliseconds")
    bucket["entries"].append({
        "id": entry_id,
        "ts": datetime.datetime.now().isoformat(timespec="seconds"),
        "cost": cost, 
        "meta": meta,
        "state": state
    })
    _save(data)
    return entry_id


def update_state(entry_id: str, new_state: str, observed_cost: float = None):
    """기존 기록의 상태(및 실측 차감액)를 업데이트한다."""
    data = _load()
    m = _month()
    bucket = data.get(m, {"entries": []})
    for e in bucket["entries"]:
        if e.get("id") == entry_id:
            e["state"] = new_state
            if observed_cost is not None:
                e["observed_cost"] = observed_cost
                if observed_cost != e["cost"]:
                    log.warning(f"크레딧 차감액 불일치: 예상 {e['cost']}, 실측 {observed_cost}")
            break
    _save(data)


def est_clips_left() -> int:
    return int(max(0, remaining()) // max(1, CREDITS_PER_GENERATION))


def status_line() -> str:
    return (f"[크레딧] 이번달 {spent():.0f}/{MONTHLY_BUDGET} 사용 · "
            f"잔여 {remaining():.0f} · 생성가능 약 {est_clips_left()}클립")


if __name__ == "__main__":
    print(status_line())
