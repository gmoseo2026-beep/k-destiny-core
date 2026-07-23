import time
from _creds import connect_client

client = connect_client()

cmds = [
    # Step 1: Pull latest code
    ("git pull", "cd /root/k-destiny-core && git pull origin main 2>&1"),
    
    # Step 2: Test the daily report script (this will actually send to Telegram!)
    ("test report", "cd /root/k-destiny-core && python3 scripts/daily_report.py 2>&1"),
    
    # Step 3: Set up system cron for daily 09:00 KST report
    ("setup cron", '(crontab -l 2>/dev/null | grep -v daily_report; echo "0 0 * * * cd /root/k-destiny-core && python3 scripts/daily_report.py >> /root/.pm2/logs/daily-report.log 2>&1") | crontab - && echo "Cron set!" && crontab -l | grep daily_report'),
    
    # Step 4: Verify cron is registered
    ("verify cron", "crontab -l 2>/dev/null | tail -3"),
]

for label, cmd in cmds:
    print(f"\n{'='*50}")
    print(f">>> [{label}] {cmd[:80]}...")
    print(f"{'='*50}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out[-2000:])
    if err: print(f"[STDERR] {err[-500:]}")
    print()

client.close()
print("\n✅ All done!")
