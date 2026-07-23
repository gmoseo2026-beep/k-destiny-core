from _creds import connect_client

client = connect_client()

cmds = [
    'cd /root/k-destiny-core && git log --oneline -3',
    'cd /root/k-destiny-core && grep -c "normalizeElement" app/\\[locale\\]/result/page.tsx',
    'cd /root/k-destiny-core && grep -c "FIVE_ELEMENTS" components/SajuChart.tsx',
    'cd /root/k-destiny-core && grep -c "section_love" messages/ko.json',
    'cd /root/k-destiny-core && grep -c "social_proof" messages/ko.json',
    'pm2 jlist 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print([(p[\"name\"],p[\"pm2_env\"][\"status\"],p[\"pid\"]) for p in d])"',
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print(f">>> {cmd[:60]}...\n  {out}")

client.close()
