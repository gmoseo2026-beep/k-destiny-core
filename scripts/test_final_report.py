import paramiko
from _creds import get_creds

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
HOST, USER, PASS = get_creds()
client.connect(HOST, username=USER, password=PASS, timeout=15, look_for_keys=False, allow_agent=False)

cmds = [
    ("pull", "cd /root/k-destiny-core && git pull origin main 2>&1"),
    ("install pg", "cd /root/k-destiny-core && npm install pg 2>&1 | tail -5"),
    ("test revenue", "cd /root/k-destiny-core && node scripts/query_revenue.js 2>&1"),
    ("full report", "cd /root/k-destiny-core && python3 scripts/daily_report.py 2>&1"),
]

for label, cmd in cmds:
    print(f"\n[{label}]")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out[-2000:])
    if err and 'warn' not in err.lower(): print(f"[STDERR] {err[-300:]}")

client.close()
print("\nDone!")
