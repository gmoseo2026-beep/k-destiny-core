#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║  콩닥(kongdak) Daily Report → Telegram                      ║
║  Runs via Hermes Agent cron or standalone                    ║
╚══════════════════════════════════════════════════════════════╝

Collects (집계 숫자만 — 개인정보 없음):
  1. 매출·주문 (Order 기준, 한국 날짜)
  2. 퍼널 (궁합 생성 → 미리보기 → 결제)
  3. 유입 (nginx 로그: 사람 방문 기기 추정, 유입 경로)
  4. 서버 상태 / PM2 / 에러 로그

Sends a formatted report to the CEO via Telegram Bot API.

Usage:
  python3 /root/k-destiny-core/scripts/daily_report.py            # 보고서 발송
  python3 /root/k-destiny-core/scripts/daily_report.py --dry-run  # 화면 출력만
  cron: 55 23 * * *  (자정 로그 교체 전에 하루치를 집계)
"""

import os, sys, json, subprocess, re, html, urllib.request, urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────
DOTENV_PATH = Path("/root/k-destiny-core/.env.local")
PM2_LOG_DIR = Path("/root/.pm2/logs")
NGINX_LOGS  = [Path("/var/log/nginx/access.log.1"), Path("/var/log/nginx/access.log")]
DRY_RUN     = "--dry-run" in sys.argv

def load_env():
    """Load .env.local key=value pairs into os.environ"""
    if not DOTENV_PATH.exists():
        return
    for line in DOTENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()

BOT_TOKEN   = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID     = os.environ.get("CEO_TELEGRAM_ID", "")

if not BOT_TOKEN or not CHAT_ID:
    print("❌ TELEGRAM_BOT_TOKEN or CEO_TELEGRAM_ID not set")
    sys.exit(1)

# ── Helpers ──────────────────────────────────────────────────────────
def run(cmd: str, timeout: int = 10) -> str:
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return (r.stdout or "").strip()
    except Exception as e:
        return f"(error: {e})"

def send_telegram(text: str):
    """Send message via Telegram Bot API (MarkdownV2)"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
    }
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read())
            if body.get("ok"):
                print(f"✅ Telegram sent ({len(text)} chars)")
            else:
                print(f"❌ Telegram error: {body}")
    except Exception as e:
        print(f"❌ Telegram failed: {e}")

# ── 1. Server Metrics ───────────────────────────────────────────────
def get_server_metrics() -> str:
    cpu = run("top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4}' ")
    mem = run("free -m | awk '/Mem:/{printf \"%.1f%% (%dMB / %dMB)\", $3/$2*100, $3, $2}'")
    disk = run("df -h / | awk 'NR==2{printf \"%s / %s (%s used)\", $3, $2, $5}'")
    uptime = run("uptime -p")
    load = run("cat /proc/loadavg | awk '{print $1, $2, $3}'")

    return (
        f"🖥️ <b>서버 상태</b>\n"
        f"  • CPU: {cpu}%\n"
        f"  • RAM: {mem}\n"
        f"  • Disk: {disk}\n"
        f"  • Load: {load}\n"
        f"  • Uptime: {uptime}"
    )

# ── 2. PM2 Status ───────────────────────────────────────────────────
def get_pm2_status() -> str:
    try:
        raw = run("pm2 jlist", timeout=5)
        procs = json.loads(raw)
        lines = []
        for p in procs:
            name = p.get("name", "?")
            env = p.get("pm2_env", {})
            status = env.get("status", "?")
            restarts = env.get("restart_time", 0)
            pid = p.get("pid", "?")
            emoji = "🟢" if status == "online" else "🔴"
            lines.append(f"  {emoji} {name}: {status} (pid={pid}, restarts={restarts})")
        return "⚙️ <b>PM2 프로세스</b>\n" + "\n".join(lines)
    except Exception as e:
        return f"⚙️ <b>PM2 프로세스</b>\n  ❌ 조회 실패: {e}"

# ── 3. 유입 (nginx) ─────────────────────────────────────────────────
BOT_RE = re.compile(r"bot|crawl|spider|facebookexternalhit|meta-external|curl|python|go-http|wget|headless|preview|scan|zgrab|okhttp|axios|expanse|censys", re.I)
ASSET_RE = re.compile(r"/_next/|\.(png|jpe?g|webp|svg|ico|js|css|woff2?|txt|xml|json)(\?|$)")
LINE_RE = re.compile(r'\[(\d+/\w+/\d+):[^\]]+\] "(\S+) (\S+) [^"]*" (\d+) \S+ "[^"]*" "([^"]*)"')

def get_visitor_stats() -> str:
    """Cloudflare 뒤라 IP 가 전부 CF 주소다 → 브라우저 정보(UA)로 방문 기기 수를 추정한다.
    페이지만 받아 가는 자동 접속이 많아, 화면이 실제로 실행돼야 나가는 요청(/api/visit·/api/auth/session)을
    보낸 기기만 '실제 방문'으로 센다(GA4 사용자 수와 비슷하게 맞는다)."""
    today = datetime.now().strftime("%d/%b/%Y")
    loaded, real, views, src = set(), set(), 0, {}
    for log in NGINX_LOGS:
        if not log.exists():
            continue
        try:
            with open(log, encoding="utf-8", errors="replace") as f:
                for line in f:
                    if today not in line:
                        continue
                    m = LINE_RE.search(line)
                    if not m:
                        continue
                    _, method, path, _, ua = m.groups()
                    if BOT_RE.search(ua):
                        continue
                    if path.startswith("/api/visit") or path.startswith("/api/auth/session"):
                        real.add(ua)
                        continue
                    if method != "GET" or ASSET_RE.search(path):
                        continue
                    if not (path == "/" or path.startswith("/ko")) or "_rsc=" in path:
                        continue
                    views += 1
                    loaded.add(ua)
                    if "utm_source=" in path:
                        s = re.search(r"utm_source=([^&]+)", path).group(1)
                        paid = "utm_medium=paid" in path
                        key = f"{s}{' 광고' if paid else ''}"
                        src[key] = src.get(key, 0) + 1
        except Exception:
            continue
    visitors = loaded & real
    src_lines = "".join(f"\n    {k}: {v}회" for k, v in sorted(src.items(), key=lambda x: -x[1])[:5])
    return (
        f"👥 <b>오늘의 유입</b>\n"
        f"  • 실제 방문(추정): {len(visitors)}명\n"
        f"  • 자동 접속 포함 기기: {len(loaded)}대 · 페이지 조회 {views}회\n"
        f"  • 링크별 도착:{src_lines or ' (없음)'}"
    )

# ── 4. 매출·퍼널 (DB) ───────────────────────────────────────────────
def won(n) -> str:
    return f"{int(n or 0):,}원"

def get_revenue_stats() -> str:
    try:
        raw = run("cd /root/k-destiny-core && node scripts/query_revenue.js 2>/dev/null", timeout=40)
        line = next((l for l in reversed(raw.splitlines()) if l.startswith("REPORT_JSON:")), None)
        if not line:
            return "💰 <b>매출</b>\n  ❌ DB 조회 실패: 결과 없음"
        d = json.loads(line[len("REPORT_JSON:"):])
        if d.get("error"):
            return f"💰 <b>매출</b>\n  ❌ DB 조회 실패: {d['error'][:120]}"

        prod = "".join(f"\n    {p['k']}: {p['cnt']}건 · {won(p['total'])}" for p in d.get("products", []))
        g = d.get("gen", {})
        previews = (g.get("teaser") or 0)
        paid_cnt = d["today"]["cnt"]
        rate = f"{paid_cnt / previews * 100:.1f}%" if previews else "-"
        return (
            f"💰 <b>매출</b>\n"
            f"  • 오늘: {won(d['today']['total'])} ({paid_cnt}건)\n"
            f"  • 최근 7일: {won(d['week']['total'])} ({d['week']['cnt']}건)\n"
            f"  • 이번 달: {won(d['month']['total'])} ({d['month']['cnt']}건)"
            f"{prod}\n"
            f"  • 오늘 취소: {d.get('canceled', 0)}건 · 결제 미완료: {d.get('pending', 0)}건\n\n"
            f"🧭 <b>오늘의 퍼널</b>\n"
            f"  • 궁합 생성: {d.get('compat', 0)}건\n"
            f"  • 유료 미리보기: {previews}건 · 무료 리포트: {g.get('free') or 0}건\n"
            f"  • 결제: {paid_cnt}건 (미리보기 대비 {rate})\n"
            f"  • 생성 실패: {g.get('failed') or 0}건\n"
            f"  • 신규 가입: {d['users']['today']}명 (누적 {d['users']['total']}명)"
        )
    except Exception as e:
        return f"💰 <b>매출</b>\n  ❌ 조회 실패: {e}"

# ── 5. Error Log Summary ────────────────────────────────────────────
NOISE = re.compile(r"Server Action|nextjs\.org|ignore-listed")
ERR_STATE = PM2_LOG_DIR / ".daily_report_errlines"

def get_error_summary() -> str:
    """PM2 에러 로그엔 시각이 없다 → 지난 보고 이후 새로 쌓인 줄만 센다(이미 해결된 옛 에러를 되풀이하지 않도록)."""
    error_log = PM2_LOG_DIR / "k-destiny-error.log"
    if not error_log.exists():
        return "🚨 <b>에러 로그</b>\n  ✅ 에러 로그 없음"
    try:
        lines = error_log.read_text(encoding="utf-8", errors="replace").splitlines()
    except Exception as e:
        return f"🚨 <b>에러 로그</b>\n  ❌ 읽기 실패: {e}"

    try:
        prev = int(ERR_STATE.read_text().strip())
    except Exception:
        prev = len(lines)  # 첫 실행: 과거 누적분은 건너뛴다
    if prev > len(lines):
        prev = 0  # 로그가 비워졌다
    fresh = [l for l in lines[prev:] if not NOISE.search(l)]
    if not DRY_RUN:
        try:
            ERR_STATE.write_text(str(len(lines)))
        except Exception:
            pass

    errs = [l for l in fresh if re.search(r"Error|ERR|FATAL", l)]
    db_limit = sum("EMAXCONNSESSION" in l for l in fresh)
    counts = {}
    for l in errs:
        key = re.sub(r".*Error: ?", "", l).strip()[:80]
        if key:
            counts[key] = counts.get(key, 0) + 1
    top = "".join(f"\n    ⚠️ {n}회 {html.escape(k)}" for k, n in sorted(counts.items(), key=lambda x: -x[1])[:3])
    if not errs:
        return "🚨 <b>에러 로그</b>\n  ✅ 지난 보고 이후 새 에러 없음"
    return (
        f"🚨 <b>에러 로그</b> (지난 보고 이후)\n"
        f"  • 에러: {len(errs)}건 · DB 연결 한도 초과: {db_limit}건"
        f"{top}"
    )

# ── Main Pipeline ────────────────────────────────────────────────────
def main():
    now = datetime.now()
    header = (
        f"📊 <b>콩닥 일일 보고서</b>\n"
        f"📅 {now.strftime('%Y-%m-%d %H:%M')} (한국 시간)\n"
        f"{'─' * 24}"
    )

    sections = [
        header,
        get_revenue_stats(),
        get_visitor_stats(),
        get_server_metrics(),
        get_pm2_status(),
        get_error_summary(),
    ]
    sections.append(f"{'─' * 24}\n🤖 콩닥 운영 자동 보고 · 궁금한 건 이 대화방에서 바로 물어보세요")

    report = "\n\n".join(sections)
    print(report)
    print(f"\n{'=' * 40}")
    if DRY_RUN:
        print("(dry-run: 텔레그램 발송 생략)")
    else:
        send_telegram(report)

if __name__ == "__main__":
    main()
