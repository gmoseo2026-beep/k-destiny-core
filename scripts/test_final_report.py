import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('161.97.134.176', username='root', password='***REMOVED***', timeout=15, look_for_keys=False, allow_agent=False)

cmds = [
    ("pull", "cd /root/k-destiny-core && git pull origin main 2>&1"),
    ("test revenue query", "cd /root/k-destiny-core && node scripts/query_revenue.js 2>&1"),
    ("full report test", "cd /root/k-destiny-core && python3 scripts/daily_report.py 2>&1"),
]

for label, cmd in cmds:
    print(f"\n{'='*50}")
    print(f"[{label}]")
    print(f"{'='*50}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out[-2000:])
    if err: print(f"[STDERR] {err[-500:]}")

client.close()
print("\n✅ Done!")
