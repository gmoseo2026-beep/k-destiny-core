#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║  K-Destiny Daily Report → Telegram                          ║
║  Runs via Hermes Agent cron or standalone                    ║
╚══════════════════════════════════════════════════════════════╝

Collects:
  1. Server metrics (CPU / RAM / Disk)
  2. PM2 process status
  3. Nginx visitor stats (today)
  4. Revenue stats (daily / weekly / monthly) from PostgreSQL
  5. API call stats
  6. Error log summary

Sends a formatted report to the CEO via Telegram Bot API.

Usage:
  python3 /root/k-destiny-core/scripts/daily_report.py          # one-shot
  hermes cron add "0 9 * * *" "python3 /root/k-destiny-core/scripts/daily_report.py"
"""

import os, sys, json, subprocess, re, urllib.request, urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────
DOTENV_PATH = Path("/root/k-destiny-core/.env.local")
PM2_LOG_DIR = Path("/root/.pm2/logs")
NGINX_LOG   = Path("/var/log/nginx/access.log")

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

# ── 3. Nginx Visitors ───────────────────────────────────────────────
def get_visitor_stats() -> str:
    today = datetime.now().strftime("%d/%b/%Y")
    
    # Total requests today
    total = run(f'grep -c "{today}" {NGINX_LOG} 2>/dev/null || echo 0')
    
    # Unique IPs today
    unique_ips = run(f'grep "{today}" {NGINX_LOG} 2>/dev/null | awk \'{{print $1}}\' | sort -u | wc -l')
    
    # API calls today
    api_calls = run(f'grep "{today}" {NGINX_LOG} 2>/dev/null | grep -c "/api/"')
    
    # Generate-destiny calls
    destiny_calls = run(f'grep "{today}" {NGINX_LOG} 2>/dev/null | grep -c "generate-destiny"')
    
    # Top 5 pages
    top_pages = run(
        f'grep "{today}" {NGINX_LOG} 2>/dev/null '
        f'| awk \'{{print $7}}\' '
        f'| grep -v "\\." '
        f'| grep -v "_next" '
        f'| sort | uniq -c | sort -rn | head -5 '
        f'| awk \'{{printf "    %s  %s\\n", $1, $2}}\''
    )

    return (
        f"👥 <b>오늘의 트래픽</b>\n"
        f"  • 총 요청: {total}\n"
        f"  • 순방문자 (Unique IP): {unique_ips}\n"
        f"  • API 호출: {api_calls}\n"
        f"  • 사주 분석 요청: {destiny_calls}\n"
        f"  📊 인기 페이지:\n{top_pages or '    (없음)'}"
    )

# ── 4. Revenue Stats ────────────────────────────────────────────────
def get_revenue_stats() -> str:
    try:
        # Use Node.js + Prisma to query DB (psql not available, DB_URL in .env)
        raw = run("cd /root/k-destiny-core && node scripts/query_revenue.js 2>/dev/null", timeout=15)
        if not raw or raw.startswith("{\"error"):
            err_data = json.loads(raw) if raw else {}
            return f"💰 <b>매출 현황</b>\n  ❌ DB 조회 실패: {err_data.get('error', 'unknown')}"
        
        data = json.loads(raw)
        
        def fmt_usd(cents: int) -> str:
            return f"${cents / 100:.2f}" if cents else "$0.00"
        
        return (
            f"💰 <b>매출 현황</b>\n"
            f"  📅 오늘: {fmt_usd(data['dailyRevenue'])} ({data['dailyPremium']}건 프리미엄)\n"
            f"  📅 주간(7일): {fmt_usd(data['weeklyRevenue'])}\n"
            f"  📅 월간: {fmt_usd(data['monthlyRevenue'])}\n"
            f"  📦 오늘 개별 리포트: {data['dailyReports']}건 (총 {data['totalReports']}건)\n"
            f"  ─────────────────\n"
            f"  👤 총 회원: {data['totalUsers']}명\n"
            f"  ⭐ 프리미엄 회원: {data['totalPremium']}명"
        )
    except Exception as e:
        return f"💰 <b>매출 현황</b>\n  ❌ 조회 실패: {e}"

# ── 5. Error Log Summary ────────────────────────────────────────────
def get_error_summary() -> str:
    error_log = PM2_LOG_DIR / "k-destiny-error.log"
    if not error_log.exists():
        return "🚨 <b>에러 로그</b>\n  ✅ 에러 로그 없음"
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Count errors in last 24 hours (rough: last 200 lines)
    recent = run(f'tail -200 {error_log} | grep -c "Error\\|error\\|ERR\\|FATAL" 2>/dev/null || echo 0')
    
    # Get last 3 unique error patterns
    last_errors = run(
        f'tail -100 {error_log} '
        f'| grep -i "error\\|ERR" '
        f'| sed "s/.*Error: //" '
        f'| sort -u '
        f'| tail -3 '
        f'| head -3'
    )
    
    # Autopilot errors
    autopilot_log = PM2_LOG_DIR / "k-destiny-autopilot-error.log"
    autopilot_errs = "0"
    if autopilot_log.exists():
        autopilot_errs = run(f'tail -50 {autopilot_log} | grep -c "Error\\|error\\|ERR" 2>/dev/null || echo 0')
    
    error_lines = ""
    if last_errors:
        for line in last_errors.split('\n')[:3]:
            clean = line.strip()[:80]
            if clean:
                error_lines += f"\n    ⚠️ {clean}"
    
    return (
        f"🚨 <b>에러 로그</b>\n"
        f"  • k-destiny 최근 에러: {recent}건\n"
        f"  • autopilot 최근 에러: {autopilot_errs}건"
        f"{error_lines if error_lines else ''}"
    )

# ── Main Pipeline ────────────────────────────────────────────────────
def main():
    now = datetime.now()
    header = (
        f"📊 <b>K-Destiny 일일 보고서</b>\n"
        f"📅 {now.strftime('%Y-%m-%d %H:%M KST')}\n"
        f"{'─' * 30}"
    )
    
    sections = [
        header,
        get_server_metrics(),
        get_pm2_status(),
        get_visitor_stats(),
        get_revenue_stats(),
        get_error_summary(),
    ]
    
    footer = (
        f"\n{'─' * 30}\n"
        f"🤖 Hermes Agent 자동 보고\n"
        f"💡 <i>hermes chat</i>으로 추가 질문 가능"
    )
    sections.append(footer)
    
    report = "\n\n".join(sections)
    print(report)
    print(f"\n{'=' * 40}")
    send_telegram(report)

if __name__ == "__main__":
    main()
