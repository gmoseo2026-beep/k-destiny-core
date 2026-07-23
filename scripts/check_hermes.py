from _creds import connect_client

client = connect_client()

cmds = [
    # Hermes config
    'cat /root/.hermes/config.yaml 2>/dev/null | head -50',
    # Hermes cron
    'hermes cron list 2>/dev/null || echo "NO CRON SETUP"',
    # Hermes gateway (telegram, etc)
    'hermes gateway list 2>/dev/null || echo "NO GATEWAY"',
    # Hermes skills
    'hermes skills list 2>/dev/null || echo "NO SKILLS"',
    # Hermes status
    'hermes status 2>/dev/null | head -20 || echo "NO STATUS"',
    # Check .env.local for telegram/revenue keys
    'grep -E "TELEGRAM|GUMROAD|PADDLE" /root/k-destiny-core/.env.local 2>/dev/null || echo "NO KEYS"',
    # Check Prisma schema for payment/revenue models
    'grep -A5 "model.*Payment\\|model.*Order\\|model.*Transaction\\|model.*Revenue" /root/k-destiny-core/prisma/schema.prisma 2>/dev/null || echo "NO PAYMENT MODEL"',
    # Check PM2 logs directory
    'ls -la /root/.pm2/logs/ 2>/dev/null | head -10',
    # Check nginx/access logs
    'ls -la /var/log/nginx/ 2>/dev/null | head -5 || echo "NO NGINX LOGS"',
    # Current pm2 processes
    'pm2 jlist 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);[print(f\"{p[\\\"name\\\"]}: pid={p[\\\"pid\\\"]}, status={p[\\\"pm2_env\\\"][\\\"status\\\"]}, restarts={p[\\\"pm2_env\\\"][\\\"restart_time\\\"]}\") for p in d]" 2>/dev/null || echo "PM2 ERROR"',
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    print(f">>> {cmd[:80]}")
    if out: print(f"  {out}")
    if err and 'warning' not in err.lower() and 'deprecated' not in err.lower():
        print(f"  [ERR] {err[:300]}")
    print()

client.close()
